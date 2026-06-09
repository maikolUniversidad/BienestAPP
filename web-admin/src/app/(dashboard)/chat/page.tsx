'use client';

import { ChatModule } from '../../../components/chat-module';

export default function StaffChat() {
  return (
    <>
      <div className="page-head"><h2>Chat del equipo</h2><p>Conversa con pacientes y con otros profesionales (médicos, psicólogos, call center). Historial, archivos, fotos y notas de voz.</p></div>
      <ChatModule />
    </>
  );
}
