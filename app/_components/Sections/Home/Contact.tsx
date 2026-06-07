"use client";

import Button from "../../UI/Layout/Button";
import { useState } from "react";
import { Mail, Instagram, Globe } from "lucide-react";

export function Contact() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setStatus(res.ok ? "sent" : "error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <section
      id="contact"
      className="min-h-[90vh] px-6 py-16 md:py-24 flex items-start justify-center mx-auto"
    >
      <div className="max-w-3xl lg:max-w-4xl mx-auto w-full h-full">
        <div className="mb-16 lg:mb-24 ">
          <h2 className="text-3xl md:text-4xl tracking-tight text-center">
            Stay in touch
          </h2>
        </div>

        <div className=" mx-auto space-y-12 sm:px-8 lg:px-16">
          <div className="space-y-12">
            <p className="text-lg xl:text-xl textforeground text-center">
              Available for commissioned work, collaborations, and inquiries.
              Each piece is made to order and can be tailored to your
              requirements — get in touch to discuss.
            </p>

            <div className="max-w-3xl mx-auto  flex flex-row flex-wrap gap-4 items-center justify-center">
              <a
                href="mailto:Johnsloanpottery@gmail.com"
                className="flex items-center gap-3 hover:opacity-70 transition-opacity cursor-pointer group text-lg"
              >
                <Mail size={20} className="text-foreground " />
                <span>Johnsloanpottery@gmail.com</span>{" "}
              </a>
                <div className="flex items-center gap-3 text-lg text-foreground">
                  <Globe size={20} className="text-foreground " />
                  <span>Isle of Skye, Scotland</span>
                </div>
                <div className="flex gap-3 space-y-4 text-lg">
                  <a
                    href="https://www.instagram.com/johnsloanpottery/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center cursor-pointer gap-3 hover:opacity-70 transition-opacity"
                  >
                    <Instagram size={20} className="text-foreground" />
                    <span>Instagram</span>
                  </a>
                </div>
            </div>
              
          </div>

          <div className=" mx-auto space-y-8 lg:col-start-3 lg:col-span-2 text-lg">
            {status === "sent" ? (
              <p className="text-foreground mt-16 text-2xl text-center">
                Message sent — We&apos;ll be in touch.
              </p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-8 max-w-3xl mx-auto">
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Name"
                    required
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    className="bg-muted/40 rounded-sm p-2 border-b border-foreground/30 focus:border-foreground/60 outline-none py-2 text-base placeholder:text-foreground transition-colors w-full"
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    required
                    value={form.email}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, email: e.target.value }))
                    }
                    className="bg-muted/40 rounded-sm p-2 border-b border-foreground/30 focus:border-foreground/60 outline-none py-2 text-base placeholder:text-foreground transition-colors w-full"
                  />
                </div>
                <textarea
                  placeholder="Message"
                  required
                  rows={6}
                  value={form.message}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, message: e.target.value }))
                  }
                  className="bg-muted/40 rounded-sm p-2 border-b border-foreground/30 focus:border-foreground/60 outline-none py-2 text-base placeholder:text-foreground transition-colors w-full resize-none"
                />
                <div className="flex flex-col items-center justify-between">
                  {status === "error" && (
                    <p className="text-base text-red-500">
                      Something went wrong — please try again.
                    </p>
                  )}
                  <Button
                    type="submit"
                    disabled={status === "sending"}
                    size="sm"
                  >
                    {status === "sending" ? "Sending…" : "Send"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
