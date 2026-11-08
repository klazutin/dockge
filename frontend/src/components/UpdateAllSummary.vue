<template>
    <!-- [fork] Summary of an "Update all" run -->
    <BModal
        v-model="$root.updateAll.showSummary"
        :title="$t('updateAllCompleted')"
        :okTitle="$t('OK')"
        okOnly
        scrollable
    >
        <p v-if="$root.updateAll.cancelled" class="alert alert-warning py-2">
            {{ $t("updateAllStoppedEarly", [ results.length, $root.updateAll.total ]) }}
        </p>

        <div v-for="group in groups" :key="group.status" class="mb-3">
            <h6 class="d-flex align-items-center">
                <span class="badge rounded-pill me-2" :class="group.badge">{{ group.items.length }}</span>
                {{ group.title }}
            </h6>
            <ul v-if="group.items.length > 0" class="list-unstyled mb-0 ms-1">
                <li v-for="item in group.items" :key="item.endpoint + '/' + item.name" class="py-1">
                    <router-link :to="$root.updateAllStackUrl(item)" @click="$root.updateAll.showSummary = false">
                        {{ item.name }}
                    </router-link>
                    <span v-if="$root.agentCount > 1 && item.endpoint" class="text-secondary small"> ({{ item.endpoint }})</span>
                    <span v-if="item.status === 'unknown'" class="text-secondary small"> – {{ $t("updateAllUnknown") }}</span>
                    <div v-if="item.msg" class="small text-danger">{{ item.msg }}</div>
                </li>
            </ul>
            <div v-else class="small text-secondary ms-1">{{ $t("updateAllNone") }}</div>
        </div>
    </BModal>
</template>

<script>
import { BModal } from "bootstrap-vue-next";

export default {
    components: {
        BModal,
    },
    computed: {
        results() {
            return this.$root.updateAll.results;
        },
        groups() {
            const by = (...statuses) => this.results.filter(r => statuses.includes(r.status));
            const groups = [
                {
                    status: "changed",
                    title: this.$t("updateAllChanged"),
                    badge: "bg-primary",
                    items: by("changed", "unknown"),
                },
                {
                    status: "unchanged",
                    title: this.$t("updateAllUnchanged"),
                    badge: "bg-secondary",
                    items: by("unchanged"),
                },
                {
                    status: "failed",
                    title: this.$t("updateAllFailed"),
                    badge: "bg-danger",
                    items: by("failed"),
                },
            ];
            // Hide the failed group when nothing failed
            return groups.filter(g => g.status !== "failed" || g.items.length > 0);
        },
    },
};
</script>
