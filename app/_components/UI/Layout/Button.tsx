export default function Button(props: Readonly<{
  children: React.ReactNode;
  onClick?: () => void;
  size: string;
  disabled?: boolean;
  light?: boolean;
  type?: "button" | "submit" | "reset" ;
  }>) {
  const { children, onClick, size, disabled, light } = props;
  return (
    <button 
      type={props.type}
      disabled={disabled}
      className={` cursor-pointer rounded-sm ${light ? ' bg-muted/0  text-background border-background hover:bg-background hover:text-foreground' : 'bg-muted  text-foreground border hover:bg-muted'} text-${size} py-2 px-4 shadow-sm active:shadow-none border active:translate-y-px active:-translate-x-px transition-all duration-100 ` } onClick={onClick}>
      {children}
    </button>
  );
}
