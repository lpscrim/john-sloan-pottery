import Button from "../../UI/Layout/Button";
import Link from "next/link";

export function Create() {

  return (
    <section id="create" className="min-h-[50svh] ">
      <div className="absolute bg-black/10 w-full h-full z-9" />
      <div className="hidden md:flex w-full h-svh relative overflow-hidden justify-center items-center">
        <video
          src="/pottery.mp4"
          autoPlay
          muted
          loop
          playsInline
          className="object-cover object-center h-auto min-h-full w-full"
        />
        <div className="absolute right-16 w-1/2 flex -mt-32 flex-end font-medium justify-center tracking-wide z-20 flex-col">
            <p className="text-lg md:text-xl text-background text-right tracking-wide ">Handmade on the Isle of Skye</p>
            <h2 className="text-3xl md:text-5xl text-background text-right tracking-tight mt-12 nav">Each piece is unique</h2>
            <div className="relative self-end mt-16"> 
                <Button size="xl" light>
                <Link href="/custom-mug">Build Your Own</Link>
                </Button>
            </div>
        </div>    
      </div>
    </section>
  );
}