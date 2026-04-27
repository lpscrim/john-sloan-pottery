export default function Button(props: Readonly<{
  children: React.ReactNode;
  onClick?: () => void;
  size: string;
  disabled?: boolean;
  }>) {
  const { children, onClick, size, disabled } = props;
  return (
    <button 
      disabled={disabled}
      className={`cursor-crosshair text-foreground text-${size} py-2 px-2 rounded-xs transition-all duration-250 group` } onClick={onClick}>
      <span className="group-hover:px-0.5 transition-all duration-250">[</span>{" "}
      {children}{" "}
      <span className="group-hover:px-0.5 transition-all duration-250">]</span>
    </button>
  );
}
