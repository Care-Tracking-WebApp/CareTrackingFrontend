import styles from "@/style/RecoverPassword.module.css";
import { useState } from "react";
import { useNavigate, Link } from "react-router";
import {
  requestPasswordReset,
  confirmPasswordReset,
} from "@/services/authService";

function RecoverPassword() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleStep1 = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (!email) {
      setError("Por favor ingresa tu email");
      setLoading(false);
      return;
    }

    try {
      const response = await requestPasswordReset({ email });
      setSuccess(response.message);
      if (response.code) {
        setCode(response.code);
      }
      setTimeout(() => {
        setStep(2);
        setSuccess("");
      }, 1500);
    } catch (e) {
      setError(e.message || "Error al solicitar recuperación");
    } finally {
      setLoading(false);
    }
  };

  const handleStep2 = (e) => {
    e.preventDefault();
    setError("");

    if (!code) {
      setError("Por favor ingresa el código");
      return;
    }

    setSuccess("Código verificado correctamente");
    setTimeout(() => {
      setStep(3);
      setSuccess("");
    }, 1500);
  };

  const handleStep3 = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (!newPassword || !confirmPassword) {
      setError("Por favor completa ambas contraseñas");
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      setLoading(false);
      return;
    }

    try {
      await confirmPasswordReset({ email, code, newPassword });
      setSuccess("¡Contraseña restablecida exitosamente!");
      setTimeout(() => navigate("/"), 2000);
    } catch (e) {
      setError(e.message || "Error al restablecer contraseña");
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    setStep(step - 1);
    setError("");
    setSuccess("");
  };

  return (
    <div className={styles.recoverContainer}>
      <div className={styles.recoverCard}>
        <h1>CareTracking</h1>
        <p>Recuperar contraseña</p>

        {error && <p className={styles.error}>{error}</p>}
        {success && <p className={styles.success}>{success}</p>}

        {/* PASO 1: Solicitar código */}
        <div className={`${styles.step} ${step === 1 ? styles.active : ""}`}>

          <p
            style={{
              textAlign: "center",
              color: "#666",
              marginBottom: "20px",
              fontSize: "14px",
            }}>
            Ingresa el email asociado a tu cuenta
          </p>
          <form onSubmit={handleStep1}>
            <div className={styles.formGroup}>
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              className={styles.btnSubmit}
              disabled={loading}>
              {loading ? "Enviando..." : "Enviar código"}
            </button>
          </form>
        </div>

        {/* PASO 2: Ingresar código */}
        <div className={`${styles.step} ${step === 2 ? styles.active : ""}`}>

          <div className={styles.info}>
            Se ha enviado un código a <strong>{email}</strong>
          </div>
          <form onSubmit={handleStep2}>
            <div className={styles.formGroup}>
              <label>Código de verificación</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Ingresa el código"
                maxLength="6"
                disabled={loading}
              />
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="button"
                onClick={goBack}
                className={styles.btnSecondary}
                disabled={loading}>
                Atrás
              </button>
              <button
                type="submit"
                className={styles.btnSubmit}
                disabled={loading}>
                Verificar código
              </button>
            </div>
          </form>
        </div>

        {/* PASO 3: Nueva contraseña */}
        <div className={`${styles.step} ${step === 3 ? styles.active : ""}`}>
         
          <p
            style={{
              textAlign: "center",
              color: "#666",
              marginBottom: "20px",
              fontSize: "14px",
            }}>
            Crea tu nueva contraseña
          </p>
          <form onSubmit={handleStep3}>
            <div className={styles.formGroup}>
              <label>Nueva contraseña</label>
              <div
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  style={{ flex: 1 }}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: "12px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "18px",
                  }}
                  disabled={loading}>
                  {showPassword ? "👁️" : "👁️‍🗨️"}
                </button>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Confirmar contraseña</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite tu contraseña"
                disabled={loading}
              />
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="button"
                onClick={goBack}
                className={styles.btnSecondary}
                disabled={loading}>
                Atrás
              </button>
              <button
                type="submit"
                className={styles.btnSubmit}
                disabled={loading}>
                {loading ? "Restableciendo..." : "Restablecer contraseña"}
              </button>
            </div>
          </form>
        </div>

        {step === 1 && (
          <div className={styles.recoverLinks}>
            <p>
              <Link to="/">Volver al login</Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default RecoverPassword;
