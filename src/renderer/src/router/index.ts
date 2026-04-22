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
      },
      {
        path: 'local-metadata',
        name: 'local-metadata',
        component: () => import('@/views/LocalMusicMetadataView.vue'),
        meta: { title: '本地音乐元数据' }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
