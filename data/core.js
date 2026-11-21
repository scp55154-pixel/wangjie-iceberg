/* 冰山数据内核：各分块只向这里注册，避免任何单文件过长。 */
(function () {
  const iceberg = {
    sources: {},
    tiers: [],
    entries: [],
    categories: ["全部", "概念", "人物", "机构", "案件", "手法", "制度", "文化", "未证实"],

    addSources(map) {
      for (const [key, value] of Object.entries(map)) {
        if (!Array.isArray(value) || value.length < 5) continue;
        this.sources[key] = {
          label: value[0],
          publisher: value[1],
          year: value[2],
          type: value[3],
          url: value[4],
          note: value[5] || ""
        };
      }
    },

    addTier(tier, entries) {
      this.tiers.push(tier);
      if (Array.isArray(entries)) {
        for (const entry of entries) entry.tier = tier.id;
        this.entries.push(...entries);
      }
    }
  };

  window.ICEBERG = iceberg;
})();
