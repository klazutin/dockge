// [fork] Detect the container Dockge itself runs in.
//
// `docker compose up -d` on Dockge's own stack recreates the Dockge container: compose stops the
// old container first, and since the compose process runs *inside* that container it is killed
// along with it, before it can create and start the new one. Dockge is left stopped.
// To avoid that, the final `up -d` for Dockge's own stack is handed to a short-lived helper
// container (see Stack.composeUp), which is not affected when Dockge stops.

import fs from "fs";
import path from "path";
import childProcessAsync from "promisify-child-process";
import { log } from "./log";

export interface SelfContainer {
    /** Full container ID */
    id: string;
    /** Image reference the container was created from, e.g. klazutin/dockge:latest */
    image: string;
    /** Compose project (= Dockge stack name) the container belongs to */
    project: string;
    /** Compose working directory label, if any */
    workingDir: string;
}

let cached : SelfContainer | null = null;

/**
 * Container ID candidates for the current process: the ID found in /proc/self/mountinfo
 * (the bind mounts of /etc/hostname etc. contain it), then $HOSTNAME (Docker's default hostname
 * is the short container ID).
 * @returns {string[]} Candidate IDs
 */
function candidateIds() : string[] {
    const ids : string[] = [];
    try {
        const mountinfo = fs.readFileSync("/proc/self/mountinfo", "utf-8");
        const match = mountinfo.match(/\/containers\/([0-9a-f]{64})\//);
        if (match) {
            ids.push(match[1]);
        }
    } catch (e) {
        // Not Linux, or not readable
    }
    if (process.env.HOSTNAME && /^[0-9a-f]{12,64}$/.test(process.env.HOSTNAME)) {
        ids.push(process.env.HOSTNAME);
    }
    return ids;
}

/**
 * Find Dockge's own container, if Dockge runs inside a Compose-managed container.
 * @returns {Promise<SelfContainer | null>} The container, or null when not found
 */
export async function getSelfContainer() : Promise<SelfContainer | null> {
    if (cached) {
        return cached;
    }

    for (const id of candidateIds()) {
        try {
            const res = await childProcessAsync.spawn("docker", [ "inspect", "--type", "container", "--format", "{{json .}}", id ], {
                encoding: "utf-8",
            });
            const info = JSON.parse(res.stdout?.toString() ?? "");
            const labels = info?.Config?.Labels ?? {};
            const project = labels["com.docker.compose.project"];
            if (!project || !info.Id || !info.Config?.Image) {
                continue;
            }
            cached = {
                id: info.Id,
                image: info.Config.Image,
                project,
                workingDir: labels["com.docker.compose.project.working_dir"] ?? "",
            };
            log.info("self-container", `Dockge runs in container ${cached.id.substring(0, 12)} (stack "${cached.project}", image ${cached.image})`);
            return cached;
        } catch (e) {
            // Not a container ID we can inspect
        }
    }
    return null;
}

/**
 * Is this stack the one Dockge itself runs in?
 * @param {string} stackName Stack name
 * @param {string} stackPath Stack directory
 * @returns {Promise<SelfContainer | null>} Dockge's container if so, otherwise null
 */
export async function getSelfContainerIfStack(stackName : string, stackPath : string) : Promise<SelfContainer | null> {
    const self = await getSelfContainer();
    if (!self) {
        return null;
    }
    if (self.project === stackName) {
        return self;
    }
    if (self.workingDir && path.resolve(self.workingDir) === path.resolve(stackPath)) {
        return self;
    }
    return null;
}
