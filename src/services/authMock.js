const LS_USERS = "mock_auth_users";
const LS_SESSION = "mock_auth_session";
const LS_RESET_CODES = "mock_auth_reset_codes";

const delay = (ms = 500) => new Promise((r) => setTimeout(r, ms));

const nowISO = () => new Date().toISOString();

const uuid = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID)
    return crypto.randomUUID();
  return `id_${Math.random().toString(16).slice(2)}_${Date.now()}`;
};

// ==================== UTILIDADES ====================

const normalizeEmail = (email) => {
  return String(email || "").toLowerCase().trim();
};

const mockHash = (password) => {
  return `hash_${password}`;
};

const checkPassword = (password, hash) => {
  return mockHash(password) === hash;
};

const saveUsers = (users) => {
  localStorage.setItem(LS_USERS, JSON.stringify(users));
};

const loadUsers = () => {
  const raw = localStorage.getItem(LS_USERS);
  return raw ? JSON.parse(raw) : [];
};

const setSession = (session) => {
  localStorage.setItem(LS_SESSION, JSON.stringify(session));
};

const getSession = () => {
  const raw = localStorage.getItem(LS_SESSION);
  return raw ? JSON.parse(raw) : null;
};

const createSession = (user) => {
  return {
    id: uuid(),
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: nowISO(),
  };
};

const loadResetCodes = () => {
  const raw = localStorage.getItem(LS_RESET_CODES);
  return raw ? JSON.parse(raw) : {};
};

const saveResetCodes = (codes) => {
  localStorage.setItem(LS_RESET_CODES, JSON.stringify(codes));
};

// ==================== FUNCIONES PÚBLICAS ====================

export const register = async ({ name, email, password, phone, role = "acompaniante" }) => {
  await delay();

  const normalizedEmail = normalizeEmail(email);
  const users = loadUsers();

  const exists = users.some((u) => u.email === normalizedEmail);
  if (exists) throw new Error("El email ya está registrado");

  const newUser = {
    id: uuid(),
    name: String(name || "").trim(),
    email: normalizedEmail,
    phone: String(phone || "").trim(),
    role: role,
    passwordHash: mockHash(password),
    createdAt: nowISO(),
    verified: false,
    documents: []
  };

  users.push(newUser);
  saveUsers(users);

  return {
    id: newUser.id,
    name: newUser.name,
    email: newUser.email,
    role: newUser.role,
    message: "Registro exitoso. Por favor verifica tu email."
  };
};

export const login = async ({ email, password }) => {
  await delay();

  const normalizedEmail = normalizeEmail(email);
  const users = loadUsers();

  const user = users.find((u) => u.email === normalizedEmail);
  if (!user) throw new Error("Usuario no encontrado");

  if (!checkPassword(password, user.passwordHash)) {
    throw new Error("Contraseña incorrecta");
  }

  const session = createSession(user);
  setSession(session);

  return {
    session,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  };
};

export const requestPasswordReset = async ({ email }) => {
  await delay();

  const normalizedEmail = normalizeEmail(email);
  const users = loadUsers();

  const user = users.find((u) => u.email === normalizedEmail);
  if (!user) throw new Error("Email no encontrado");

  const resetCode = Math.random().toString().slice(2, 8);
  const codes = loadResetCodes();

  codes[normalizedEmail] = {
    code: resetCode,
    createdAt: nowISO(),
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
    attempts: 0
  };

  saveResetCodes(codes);

  console.log(`[MOCK] Código de recuperación para ${normalizedEmail}: ${resetCode}`);

  return {
    message: "Se ha enviado un código de recuperación a tu email",
    code: resetCode
  };
};

export const confirmPasswordReset = async ({ email, code, newPassword }) => {
  await delay();

  const normalizedEmail = normalizeEmail(email);
  const codes = loadResetCodes();
  const resetData = codes[normalizedEmail];

  if (!resetData) throw new Error("No existe solicitud de recuperación");

  if (resetData.code !== code) {
    resetData.attempts = (resetData.attempts || 0) + 1;
    if (resetData.attempts >= 3) {
      delete codes[normalizedEmail];
      saveResetCodes(codes);
      throw new Error("Se han agotado los intentos. Solicita una nueva recuperación.");
    }
    saveResetCodes(codes);
    throw new Error("Código incorrecto");
  }

  if (new Date(resetData.expiresAt) < new Date()) {
    delete codes[normalizedEmail];
    saveResetCodes(codes);
    throw new Error("El código ha expirado");
  }

  const users = loadUsers();
  const user = users.find((u) => u.email === normalizedEmail);

  if (!user) throw new Error("Usuario no encontrado");

  user.passwordHash = mockHash(newPassword);
  saveUsers(users);

  delete codes[normalizedEmail];
  saveResetCodes(codes);

  return {
    message: "Contraseña restablecida exitosamente"
  };
};

export const logout = async () => {
  await delay();
  localStorage.removeItem(LS_SESSION);
  return { message: "Sesión cerrada" };
};

export const getCurrentSession = async () => {
  await delay();
  const session = getSession();
  if (!session) throw new Error("No hay sesión activa");
  return session;
};

export const seedDemoUser = async () => {
  const users = loadUsers();

  if (users.length === 0) {
    try {
      await register({
        name: "Demo User",
        email: "demo@demo.com",
        password: "123456",
        phone: "+54 9 1234567890",
        role: "admin"
      });
      console.log("Usuario demo creado exitosamente");
    } catch (error) {
      console.error("Error al crear usuario demo:", error);
    }
  }
};
