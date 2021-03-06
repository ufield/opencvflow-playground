import Vue from 'vue'
import Router from 'vue-router'

Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/',
      name: 'main-page',
      component: require('@/components/MainPage').default
    },
    {
      path: '/flask',
      name: 'flask-page',
      component: require('@/components/FlaskPage').default
    },
    {
      path: '/custom_drag_drop',
      name: 'custom_drag_drop-page',
      component: require('@/components/CustomDragDropPage').default
    },
    {
      path: '/konva_drag_drop',
      name: 'konva_drag_drop-page',
      component: require('@/components/KonvaDragDropPage').default
    },
    {
      path: '/drag_drop',
      name: 'drag_drop-page',
      component: require('@/components/DragDropPage').default
    },
    {
      path: '/drag_drop_list',
      name: 'drag_drop_list-page',
      component: require('@/components/DragDropListPage').default
    },
    {
      path: '/line_connect',
      name: 'line_connect-page',
      component: require('@/components/LineConnectPage').default
    },
    {
      path: '/vue_diagrams',
      name: 'vue_diagrams-page',
      component: require('@/components/VueDiagramsPage').default
    },
    {
      path: '/vue_mermaid',
      name: 'vue_mermaid-page',
      component: require('@/components/VueMermaidPage').default
    },
    {
      path: '/svg_canvas',
      name: 'svg_canvas-page',
      component: require('@/components/SvgCanvasPage').default
    },
    {
      path: '/svg_page',
      name: 'svg_page',
      component: require('@/components/templates/SvgPageTemplate').default
    },
    {
      path: '/modal_page',
      name: 'modal_page',
      component: require('@/components/ModalPage').default
    },
    {
      path: '*',
      redirect: '/'
    }
  ]
})
