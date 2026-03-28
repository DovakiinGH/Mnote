import { createRouter, createWebHashHistory } from 'vue-router'
import MainView from '../views/MainView.vue'
import QuickView from '../views/QuickView.vue'
import ReminderMandatoryView from '../views/ReminderMandatoryView.vue'
import PomodoroView from '../views/PomodoroView.vue'
import SettingsView from '../views/SettingsView.vue'
const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: MainView },
    { path: '/quick', component: QuickView },
    { path: '/reminder-mandatory', component: ReminderMandatoryView },
    {path: '/pomodoro',component: PomodoroView},
    {path: '/settings',component: SettingsView}
  ]
})

export default router