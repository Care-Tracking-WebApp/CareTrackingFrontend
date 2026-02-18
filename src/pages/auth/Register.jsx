import styles from "@/style/Register.module.css";
import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { register } from "@/services/authService";

function Register() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    role: "acompaniante",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (
      !formData.name ||
      !formData.email ||
      !formData.password ||
      !formData.phone
    ) {
      setError("Por favor completa todos los campos");
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Las contraseñas no coinciden");
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      setLoading(false);
      return;
    }

    try {
      await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        role: formData.role,
      });
      setSuccess("¡Registro exitoso! Redirigiendo al login...");
      setTimeout(() => navigate("/"), 2000);
    } catch (e) {
      setError(e.message || "Error al registrarse");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.registerContainer}>
      <div className={styles.registerCard}>
        <h1>CareTracking</h1>
        <p>Crear nueva cuenta</p>

        {error && <p className={styles.error}>{error}</p>}
        {success && <p className={styles.success}>{success}</p>}

        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label>Nombre completo</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Tu nombre"
              disabled={loading}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="tu@email.com"
              disabled={loading}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Teléfono</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+54 9 1234 567890"
              disabled={loading}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Tipo de usuario</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              disabled={loading}>
              <option value="acompaniante">Acompañante/Cuidador</option>
              <option value="familia">Familia del Paciente</option>
              <option value="admin">Administración</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>Contraseña</label>
            <div className={styles.passwordField}>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Mínimo 6 caracteres"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={styles.togglePassword}>
                {showPassword ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Confirmar contraseña</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Repite tu contraseña"
              disabled={loading}
            />
          </div>

          <button type="submit" className={styles.btnSubmit}>
            Registrarse
          </button>
        </form>

        <div className={styles.registerLinks}>
          <p>
            ¿Ya tienes cuenta? <Link to="/">Inicia sesión aquí</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;
