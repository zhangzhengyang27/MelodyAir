import { createRouter, createWebHistory, createWebHashHistory } from 'vue-router'
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
        path: 'dj',
        name: 'dj',
        component: () => import('@/views/DjView.vue'),
        meta: { title: '播客' }
      },
      {
        path: 'dj/:rid',
        name: 'dj-detail',
        component: () => import('@/views/DjDetailView.vue'),
        meta: { title: '电台' }
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
        path: 'playlist/:id',
        name: 'playlist',
        component: () => import('@/views/PlaylistDetailView.vue'),
        meta: { title: '歌单' }
      },
      {
        path: 'song/:id',
        name: 'song',
        component: () => import('@/views/SongDetailView.vue'),
        meta: { title: '歌曲' }
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
        path: 'daily',
        name: 'daily',
        component: () => import('@/views/DailyRecommendView.vue'),
        meta: { title: '每日推荐' }
      },
      {
        path: 'playlists',
        name: 'playlists',
        component: () => import('@/views/PlaylistsView.vue'),
        meta: { title: '歌单广场' }
      },
      {
        path: 'artists',
        name: 'artists',
        component: () => import('@/views/ArtistsView.vue'),
        meta: { title: '歌手' }
      },
      {
        path: 'mv-browse',
        name: 'mv-browse',
        component: () => import('@/views/MvBrowseView.vue'),
        meta: { title: 'MV' }
      },
      {
        path: 'albums',
        name: 'albums',
        component: () => import('@/views/AlbumsView.vue'),
        meta: { title: '新碟上架' }
      },
      {
        path: 'user/:uid',
        name: 'user',
        component: () => import('@/views/UserView.vue'),
        meta: { title: '用户' }
      },
      {
        path: 'settings',
        name: 'settings',
        component: () => import('@/views/SettingsView.vue'),
        meta: { title: '设置' }
      }
    ]
  },
  {
    path: '/mini-player',
    name: 'mini-player',
    component: () => import('@/views/MiniPlayerView.vue'),
    meta: { title: '迷你播放器' }
  },
  {
    path: '/desktop-lyrics',
    name: 'desktop-lyrics',
    component: () => import('@/views/DesktopLyricsView.vue'),
    meta: { title: '桌面歌词' }
  }
]

const router = createRouter({
  // Web 部署（--mode web，.env.web）用 history 模式，需 Nginx try_files 回退到 /index.html；
  // Electron 保持 hash：生产走 file:// 协议，且主进程以 #/mini-player、#/desktop-lyrics 打开子窗口
  history:
    import.meta.env.VITE_ROUTER_MODE === 'history' ? createWebHistory() : createWebHashHistory(),
  routes
})

export default router
