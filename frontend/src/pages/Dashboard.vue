<template>
    <div class="container-fluid">
        <div class="row">
            <div v-if="!$root.isMobile" class="col-12 col-md-4 col-xl-3">
                <div class="d-flex align-items-center mb-3">
                    <router-link to="/compose" class="btn btn-primary text-nowrap"><font-awesome-icon icon="plus" /> {{ $t("compose") }}</router-link>

                    <!-- [fork] Update all running stacks -->
                    <button
                        v-if="!$root.updateAll.running" class="btn btn-normal ms-auto text-nowrap" type="button"
                        :title="$t('updateAllHint')" @click="$refs.stackList.confirmUpdateAll()"
                    >
                        <font-awesome-icon icon="cloud-arrow-down" class="me-1" />
                        {{ $t("updateAll") }}
                    </button>
                    <div v-else class="d-flex align-items-center ms-auto text-nowrap" :title="$t('updateAllProgress', [ $root.updateAll.index, $root.updateAll.total ])">
                        <span class="spinner-border spinner-border-sm me-2" role="status"></span>
                        <span class="me-2">{{ $root.updateAll.index }}/{{ $root.updateAll.total }}</span>
                        <button
                            class="btn btn-normal" type="button"
                            :disabled="$root.updateAll.cancelRequested" :title="$t('updateAllStop')"
                            @click="$root.cancelUpdateAll()"
                        >
                            <font-awesome-icon icon="stop" />
                        </button>
                    </div>
                </div>
                <StackList ref="stackList" :scrollbar="true" />
            </div>

            <div ref="container" class="col-12 col-md-8 col-xl-9 mb-3">
                <!-- Add :key to disable vue router re-use the same component -->
                <router-view :key="$route.fullPath" :calculatedHeight="height" />
            </div>
        </div>

        <!-- [fork] Summary shown when "Update all" finishes -->
        <UpdateAllSummary />
    </div>
</template>

<script>

import StackList from "../components/StackList.vue";
import UpdateAllSummary from "../components/UpdateAllSummary.vue";

export default {
    components: {
        StackList,
        UpdateAllSummary,
    },
    data() {
        return {
            height: 0
        };
    },
    mounted() {
        this.height = this.$refs.container.offsetHeight;
    },
};
</script>

<style lang="scss" scoped>
.container-fluid {
    width: 98%;
}
</style>
