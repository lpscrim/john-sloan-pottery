export default function Button(props: Readonly<{
  children: React.ReactNode;
  onClick?: () => void;
  size: string;
  disabled?: boolean;
  type?: "button" | "submit" | "reset" ;
  }>) {
  const { children, onClick, size, disabled } = props;
  return (
    <button 
      type={props.type}
      disabled={disabled}
      className={`bg-muted/90 hover:bg-muted/80 cursor-pointer rounded-md text-foreground text-${size} py-2 px-4 shadow-sm active:shadow-none active:bg-muted active:translate-y-0.5 active:-translate-x-0.5 transition-all duration-250 ` } onClick={onClick}>
      {children}
    </button>
  );
}
