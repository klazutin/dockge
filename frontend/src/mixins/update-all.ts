// [fork] "Update all" – update running stacks one after another.
// Lives on the root app so the run survives route changes (each stack's page is opened while it updates).
import { defineComponent } from "vue";

export interface UpdateAllTarget {
    name: string;
    endpoint: string;
}

export interface UpdateAllResult extends UpdateAllTarget {
    /** changed: new image(s) now running, unchanged: already up to date, unknown: updated but could not compare images */
    status: "changed" | "unchanged" | "unknown" | "failed";
    msg?: string;
}

interface UpdateStackResponse {
    ok: boolean;
    msg?: unknown;
    msgi18n?: boolean;
    changed?: boolean | null;
}

export default defineComponent({
    data() {
        return {
            updateAll: {
                running: false,
                cancelRequested: false,
                total: 0,
                index: 0,
                current: null as UpdateAllTarget | null,
                results: [] as UpdateAllResult[],
                showSummary: false,
                cancelled: false,
            },
            // Resolver of the in-flight updateStack call, so a lost connection can fail it
            updateAllPending: null as ((res: UpdateStackResponse) => void) | null,
        };
    },

    watch: {
        "socketIO.connected"(connected: boolean) {
            if (!connected && this.updateAllPending) {
                this.updateAllPending({
                    ok: false,
                    msg: "Lost connection to the server",
                });
            }
        },
    },

    methods: {
        /**
         * Update the given stacks sequentially, then show a summary
         * @param {UpdateAllTarget[]} targets Stacks to update, in order
         * @returns {Promise<void>}
         */
        async startUpdateAll(targets: UpdateAllTarget[]) {
            if (this.updateAll.running || targets.length === 0) {
                return;
            }

            Object.assign(this.updateAll, {
                running: true,
                cancelRequested: false,
                cancelled: false,
                total: targets.length,
                index: 0,
                current: null,
                results: [],
                showSummary: false,
            });

            for (const target of targets) {
                if (this.updateAll.cancelRequested) {
                    this.updateAll.cancelled = true;
                    break;
                }

                this.updateAll.index++;
                this.updateAll.current = target;

                // Open the stack so its progress terminal shows the pull/up output.
                // If navigation is refused (e.g. unsaved edits), keep going anyway.
                try {
                    await this.$router.push(this.updateAllStackUrl(target));
                } catch (e) {
                    // ignore
                }

                const res = await this.updateAllEmit(target);
                this.toastRes(res);

                let status: UpdateAllResult["status"];
                if (!res.ok) {
                    status = "failed";
                } else if (res.changed === true) {
                    status = "changed";
                } else if (res.changed === false) {
                    status = "unchanged";
                } else {
                    status = "unknown";
                }

                this.updateAll.results.push({
                    ...target,
                    status,
                    msg: res.ok ? undefined : this.updateAllMessage(res),
                });

                if (!this.socketIO.connected) {
                    this.updateAll.cancelled = true;
                    break;
                }
            }

            this.updateAll.current = null;
            this.updateAll.running = false;
            this.updateAll.showSummary = true;
        },

        /**
         * Ask the running update-all to stop after the stack currently updating
         * @returns {void}
         */
        cancelUpdateAll() {
            if (this.updateAll.running) {
                this.updateAll.cancelRequested = true;
            }
        },

        /**
         * Is this stack currently being updated by update-all?
         * @param {string} name Stack name
         * @param {string} endpoint Agent endpoint
         * @returns {boolean} True while it is updating
         */
        isUpdatingInUpdateAll(name: string, endpoint: string) {
            const current = this.updateAll.current;
            return !!current && current.name === name && (current.endpoint || "") === (endpoint || "");
        },

        /**
         * @param {UpdateAllTarget} target Stack
         * @returns {string} URL of the stack's page
         */
        updateAllStackUrl(target: UpdateAllTarget) {
            return target.endpoint ? `/compose/${target.name}/${target.endpoint}` : `/compose/${target.name}`;
        },

        /**
         * @param {UpdateAllTarget} target Stack
         * @returns {Promise<UpdateStackResponse>} Server response
         */
        updateAllEmit(target: UpdateAllTarget) : Promise<UpdateStackResponse> {
            return new Promise((resolve) => {
                let settled = false;
                const done = (res: UpdateStackResponse) => {
                    if (settled) {
                        return;
                    }
                    settled = true;
                    this.updateAllPending = null;
                    resolve(res);
                };
                this.updateAllPending = done;

                if (!this.socketIO.connected) {
                    done({
                        ok: false,
                        msg: "Lost connection to the server",
                    });
                    return;
                }
                this.emitAgent(target.endpoint, "updateStack", target.name, done);
            });
        },

        /**
         * @param {UpdateStackResponse} res Server response
         * @returns {string} Readable message
         */
        updateAllMessage(res: UpdateStackResponse) {
            const msg = res.msg;
            if (res.msgi18n) {
                if (msg != null && typeof msg === "object") {
                    const m = msg as { key: string, values: unknown };
                    return this.$t(m.key, m.values as Record<string, unknown>);
                }
                return this.$t(String(msg));
            }
            return msg == null ? "" : String(msg);
        },
    },
});
