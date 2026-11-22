"use client";

import { useRef } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";

export function WorkspaceShell({ user, children }: { user: { name: string; email: string }; children: React.ReactNode }) {
  const mobileMenu = useRef<HTMLDialogElement>(null);
  return <div className="min-h-screen bg-background text-foreground lg:flex">
    <aside className="sticky top-0 hidden h-dvh shrink-0 lg:block"><Sidebar /></aside>
    <dialog ref={mobileMenu} aria-label="Workspace navigation" className="fixed bottom-0 left-0 top-0 m-0 h-dvh max-h-none w-[280px] max-w-[85vw] bg-transparent p-0 backdrop:bg-black/55 lg:hidden"
      onClick={(event) => { if (event.target === event.currentTarget) mobileMenu.current?.close(); }}>
      <Sidebar close={() => mobileMenu.current?.close()} />
    </dialog>
    <div className="min-w-0 flex-1">
      <Header user={user} openMenu={() => mobileMenu.current?.showModal()} />
      <main id="workspace-content" className="mx-auto w-full max-w-[1510px] px-3 py-5 sm:px-6 sm:py-7 xl:px-8">
        {children}
      </main>
    </div>
  </div>;
}
