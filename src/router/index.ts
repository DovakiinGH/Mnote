import { createRouter, createWebHashHistory } from 'vue-router'
import MainView from '../views/MainView.vue'
import QuickView from '../views/QuickView.vue'
import ReminderMandatoryView from '../views/ReminderMandatoryView.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: MainView },
    { path: '/quick', component: QuickView },
    { path: '/reminder-mandatory', component: ReminderMandatoryView }
  ]
})

export default router