export function renderLoginHtml({ error = null } = {}) {
  const errorMsg = error
    ? `<div style="background-color: #f8d7da; color: #721c24; padding: 10px; border-radius: 4px; margin-bottom: 20px; text-align: center;">${error}</div>`
    : "";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Admin Login - MajorLogic</title>
  <style>
    body {
      font-family: 'Inter', system-ui, sans-serif;
      background-color: #0d0d1a;
      color: #e0e0e0;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
    }
    .login-container {
      background-color: #1a1a2e;
      padding: 40px;
      border-radius: 12px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
      width: 100%;
      max-width: 400px;
    }
    .login-container h1 {
      margin-top: 0;
      font-size: 24px;
      text-align: center;
      margin-bottom: 30px;
      color: #fff;
    }
    .form-group {
      margin-bottom: 20px;
    }
    .form-group label {
      display: block;
      margin-bottom: 8px;
      font-size: 14px;
      color: #a0a0b0;
    }
    .form-group input {
      width: 100%;
      padding: 12px;
      background-color: #0d0d1a;
      border: 1px solid #333;
      border-radius: 6px;
      color: #fff;
      font-size: 16px;
      box-sizing: border-box;
      transition: border-color 0.2s;
    }
    .form-group input:focus {
      outline: none;
      border-color: #7C3AED;
    }
    .btn {
      width: 100%;
      padding: 12px;
      background-color: #7C3AED;
      color: #fff;
      border: none;
      border-radius: 6px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    .btn:hover {
      background-color: #6D28D9;
    }
  </style>
</head>
<body>
  <div class="login-container">
    <h1>MajorLogic Admin</h1>
    ${errorMsg}
    <form action="/admin/login" method="POST">
      <div class="form-group">
        <label for="username">Username</label>
        <input type="text" id="username" name="username" required autofocus>
      </div>
      <div class="form-group">
        <label for="password">Password</label>
        <input type="password" id="password" name="password" required>
      </div>
      <button type="submit" class="btn">Sign In</button>
    </form>
  </div>
</body>
</html>
  `;
}
