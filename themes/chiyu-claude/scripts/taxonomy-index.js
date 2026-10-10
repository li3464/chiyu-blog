'use strict';

// 生成分类 / 标签的列表页（/categories/ 与 /tags/）。
// hexo-generator-category@2 不生成分类列表页；hexo-generator-tag@2 的列表页默认关闭。
function makeIndexPage(config, locals, kind) {
  const dir = (config[kind + '_dir'] || kind) + '/';

  return {
    path: dir,
    layout: [kind, 'archive', 'index'],
    data: {
      title: kind === 'category' ? '分类' : '标签',
      base: dir,
      total: 1,
      current: 1,
      current_url: dir,
      posts: locals.posts,
      prev: 0,
      prev_link: '',
      next: 0,
      next_link: ''
    }
  };
}

hexo.extend.generator.register('chiyu-taxonomy-index', function (locals) {
  return [
    makeIndexPage(this.config, locals, 'category'),
    makeIndexPage(this.config, locals, 'tag')
  ];
});
