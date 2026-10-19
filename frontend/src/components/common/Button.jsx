function Button({
  children,
  type = "button",
  onClick,
  className = "",
  disabled = false,
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`common-button ${className}`}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export default Button;