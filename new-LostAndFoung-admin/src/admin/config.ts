// 当前服务器已经确认存在的接口，打开对应页面就能直接使用。
// 后端补好新接口后，把 false 改成 true 即可。
export const backendSupport = {
  // GET /api/v1/admin/claims
  // PATCH /api/v1/admin/claims/:id/review
  // 实测：这两个管理端接口不存在。
  // 学生端会话接口存在，但管理员 GET /conversations 返回空列表。
  adminClaims: false,

  // GET /api/v1/admin/users
  // PATCH /api/v1/admin/users/:id/status
  // PATCH /api/v1/admin/users/:id/role
  adminUsers: false,

  // GET /api/v1/announcements
  // POST /api/v1/admin/announcements
  // PUT /api/v1/admin/announcements/:id
  // PATCH /api/v1/admin/announcements/:id/status
  // DELETE /api/v1/admin/announcements/:id
  adminAnnouncements: false,

  // GET /api/v1/admin/stats
  statistics: false,
}
