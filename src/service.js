const mysql = require('mysql2');
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

module.exports = {
  getUserById: async (id) => {
    const [rows] = await db.promise().query('SELECT * FROM users WHERE id = ?', [id]);
    return rows[0];
  },

  addUser: async (id, name) => {
    await db.promise().query('INSERT INTO users (id, name) VALUES (?, ?)', [id, name]);
  },

  setUserMenuLevel: async (id, level) => {
    await db.promise().query('UPDATE users SET menu_level = ? WHERE id = ?', [level, id]);
  },

  setUserMenuLevel: async (id, level) => {
    await db.promise().query('UPDATE users SET menu_level = ? WHERE id = ?', [level, id]);
  },

  setUserStaffId: async (id, staffId) => {
    await db.promise().query('UPDATE users SET staff_id = ? WHERE id = ?', [staffId, id]);
  },

  setUserOperationId : async (id, operationId) => {
    await db.promise().query('UPDATE users SET operation_id = ? WHERE id = ?', [operationId, id]);
  },

  setUserComment: async (id, comment) => {
    await db.promise().query('UPDATE users SET comment = ? WHERE id = ?', [comment, id]);
  },

  getStaffList: async (text) => {
    const [rows] = await db.promise().query('SELECT * FROM staff WHERE name LIKE ? OR login LIKE ? LIMIT 5', [`%${text}%`, `%${text}%`]);
    return rows;
  },

  getStaff: async (login) => {
    const [rows] = await db.promise().query('SELECT * FROM staff WHERE login = ?', [login]);
    return rows[0];
  },

  createLog: async (userId, staffId, opId, comment, startAt) => {
    await db.promise().query('INSERT INTO logs (users_id, staff_id, operations_id, comment, start_at) VALUES (?, ?, ?, ?, ?)', [userId, staffId, opId, comment, startAt]);
  },

  getOperation: async (name) => {
    const [rows] = await db.promise().query('SELECT * FROM operations WHERE name = ?', [name]);
    return rows[0];
  },

  getOperationById : async (id) => {
    const [rows] = await db.promise().query('SELECT * FROM operations WHERE id = ?', [id]);
    return rows[0];
  },

  getOperations: async () => {
    const [rows] = await db.promise().query('SELECT * FROM operations');
    return rows;
  },

  getActiveOperation: async (staffId) => {
    const [rows] = await db.promise().query('SELECT * FROM logs WHERE staff_id = ? AND finish_at IS NULL LIMIT 1', [staffId]);
    return rows[0];
  },

  updateLogFinishTime: async (logId, finishAt) => {
    await db.promise().query('UPDATE logs SET finish_at = ? WHERE id = ?', [finishAt, logId]);
  },

  getFormattedLogs: async () => {
    const [rows] = await db.promise().query(`
        SELECT 
        u.fio, 
        s.name as staff_name,
        s.login as staff_login, 
        o.name as operation_name, 
        logs.comment, 
        start_at, 
        finish_at, 
        CONVERT_TZ(created_at, \'+00:00\', \'+03:00\') AS created_at, 
        CONVERT_TZ(updated_at, \'+00:00\', \'+03:00\') AS updated_at  
        
        from 
        logs left join operations o on o.id = logs.operations_id 
        left join users u on logs.users_id = u.id 
        left join staff s on logs.staff_id = s.id order by start_at desc`);
    return rows;
  },

  getOpenOperationsByUser: async (userId) => {
    const [rows] = await db.promise().query(`
      SELECT 
      s.login as login,
      s.name as name,
      o.name as operation_name,
      logs.start_at
      FROM logs 
      left join staff s on logs.staff_id = s.id
      left join operations o on o.id = logs.operations_id 
      WHERE users_id = ? 
      AND finish_at IS NULL
    `, [userId]);
    return rows;
  }
};
