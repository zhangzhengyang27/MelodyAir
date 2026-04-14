import { createRouter, createWebHashHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('@/components/layout/AppLayout.vue'),
    children: [
      {
        path: '',
        name: 'discover',
        component: () => import('@/views/DiscoverView.vue'),
        meta: { title: '发现' }
      },
      {
        path: 'search',
        name: 'search',
        component: () => import('@/views/SearchView.vue'),
        meta: { title: '搜索' }
      },
      {
        path: 'toplist',
        name: 'toplist',
        component: () => import('@/views/ToplistView.vue'),
        meta: { title: '排行榜' }
      },
      {
        path: 'library',
        name: 'library',
        component: () => import('@/views/LibraryView.vue'),
        meta: { title: '我的音乐' }
      },
      {
        path: 'fm',
        name: 'fm',
        component: () => import('@/views/FmView.vue'),
        meta: { title: '私人FM' }
      },
      {
        path: 'cloud',
        name: 'cloud',
        component: () => import('@/views/CloudView.vue'),
        meta: { title: '云盘' }
      },
      {
        path: 'local',
        name: 'local-music',
        component: () => import('@/views/LocalMusicView.vue'),
        meta: { title: '本地音乐' }
      },
      {
        path: 'local/album/:id',
        name: 'local-album',
        component: () => import('@/views/LocalAlbumDetailView.vue'),
        meta: { title: '本地专辑' }
      },
      {
        path: 'local/artist/:id',
        name: 'local-artist',
        component: () => import('@/views/LocalArtistDetailView.vue'),
        meta: { title: '本地歌手' }
      },
      {
        path: 'playlist/:id',
        name: 'playlist',
        component: () => import('@/views/PlaylistDetailView.vue'),
        meta: { title: '歌单' }
      },
      {
        path: 'artist/:id',
        name: 'artist',
        component: () => import('@/views/ArtistDetailView.vue'),
        meta: { title: '歌手' }
      },
      {
        path: 'album/:id',
        name: 'album',
        component: () => import('@/views/AlbumDetailView.vue'),
        meta: { title: '专辑' }
      },
      {
        path: 'mv/:id',
        name: 'mv',
        component: () => import('@/views/MvDetailView.vue'),
        meta: { title: 'MV' }
      },
      {
        path: 'login',
        name: 'login',
        component: () => import('@/views/LoginView.vue'),
        meta: { title: '登录' }
      },
      {
        path: 'settings',
        name: 'settings',
        component: () => import('@/views/SettingsView.vue'),
        meta: { title: '设置' }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
