'use client';

import { ChatModule } from '../../../components/chat-module';

export default function MensajesChat() {
  return (
    <>
      <div className="page-head"><h2>Mensajes</h2><p>Conversa con tu equipo de salud: call center, médicos, psicólogos y más. Envía fotos, archivos y notas de voz.</p></div>
      <ChatModule />
    </>
  );
}
