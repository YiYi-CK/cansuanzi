import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/auth/LoginView.vue'),
    meta: { guest: true },
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('../views/auth/RegisterView.vue'),
    meta: { guest: true },
  },
  {
    path: '/',
    component: () => import('../layouts/OwnerLayout.vue'),
    meta: { requiresAuth: true, role: ['owner', 'manager'] },
    children: [
      { path: '', redirect: '/dashboard' },
      { path: 'dashboard', name: 'Dashboard', component: () => import('../views/owner/DashboardView.vue') },
      { path: 'employees', name: 'Employees', component: () => import('../views/owner/EmployeesView.vue') },
      { path: 'schedule', name: 'Schedule', component: () => import('../views/owner/ScheduleView.vue') },
      { path: 'approvals', name: 'Approvals', component: () => import('../views/owner/ApprovalsView.vue') },
      { path: 'reports/import', name: 'ReportImport', component: () => import('../views/owner/ReportImportView.vue') },
      { path: 'reports/payroll', name: 'Payroll', component: () => import('../views/owner/PayrollView.vue') },
      { path: 'settings', name: 'Settings', component: () => import('../views/owner/SettingsView.vue') },
    ],
  },
  {
    path: '/my',
    component: () => import('../layouts/EmployeeLayout.vue'),
    meta: { requiresAuth: true, role: ['owner', 'manager', 'employee'] },
    children: [
      { path: '', redirect: '/my/schedule' },
      { path: 'schedule', name: 'MySchedule', component: () => import('../views/employee/MyScheduleView.vue') },
      { path: 'requests', name: 'MyRequests', component: () => import('../views/employee/MyRequestsView.vue') },
      { path: 'profile', name: 'MyProfile', component: () => import('../views/employee/MyProfileView.vue') },
    ],
  },
  { path: '/:pathMatch(.*)*', name: 'NotFound', component: () => import('../views/NotFoundView.vue') },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (to.meta.requiresAuth && !token) return next('/login');
  if (to.meta.guest && token) return next('/dashboard');
  if (to.meta.role && !to.meta.role.some(r => user.role === r)) return next('/my/schedule');

  next();
});

export default router;
