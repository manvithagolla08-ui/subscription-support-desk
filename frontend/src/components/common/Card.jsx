function Card({ children, className = "" }) {
  return (
    <div className={`common-card ${className}`}>
      {children}
    </div>
  );
}

export default Card;