import { useState, useMemo, useRef, useEffect } from "react"
import { Container, Heading, Text, Button, Input, clx } from "@medusajs/ui"
// Importamos usando ruta relativa para evitar problemas de alias por ahora
import {
  useVendorThreads,
  useVendorMessages,
  useVendorCreateThread,
  useVendorSendMessage
} from "../../hooks/api/support"

export const Messages = () => {
  const { data: threadsData, isLoading: loadingThreads } = useVendorThreads()
  const threads = threadsData?.threads ?? []

  const activeThread = useMemo(() =>
      threads.find((t) => t.status === "open") || threads[0],
    [threads])

  const { data: msgsData } = useVendorMessages(activeThread?.id)
  const messages = msgsData?.messages ?? []

  const createThread = useVendorCreateThread()
  const sendMessage = useVendorSendMessage(activeThread?.id)
  const [draft, setDraft] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!draft.trim()) return
    sendMessage.mutate({ body: draft }, { onSuccess: () => setDraft("") })
  }

  return (
    <Container className="divide-y p-0 min-h-[700px] flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading>Soporte con Administración</Heading>
      </div>

      <div className="flex-1 px-6 py-4 overflow-y-auto space-y-4 bg-ui-bg-subtle">
        {loadingThreads ? (
          <Text>Cargando...</Text>
        ) : !activeThread ? (
          <div className="flex flex-col items-center justify-center h-full">
            <Button
              onClick={() => createThread.mutate({ body: "Iniciando chat de soporte" })}
              isLoading={createThread.isPending}
            >
              Abrir Ticket de Soporte
            </Button>
          </div>
        ) : (
          <>
            {messages.map((m) => (
              <div key={m.id} className={clx("flex flex-col", m.author_type === 'seller' ? "items-end" : "items-start")}>
                <div className={clx(
                  "max-w-[75%] p-3 rounded-2xl text-sm shadow-sm",
                  m.author_type === 'seller'
                    ? "bg-ui-bg-interactive text-white"
                    : "bg-ui-bg-base border text-ui-fg-base"
                )}>
                  {m.body}
                </div>
                <Text size="xsmall" className="text-ui-fg-muted mt-1">
                  {new Date(m.created_at).toLocaleTimeString()}
                </Text>
              </div>
            ))}
            <div ref={scrollRef} />
          </>
        )}
      </div>

      {activeThread?.status === "open" && (
        <form onSubmit={handleSend} className="px-6 py-4 flex gap-2 border-t">
          <Input
            placeholder="Escribe un mensaje..."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <Button type="submit" isLoading={sendMessage.isPending} disabled={!draft.trim()}>
            Enviar
          </Button>
        </form>
      )}
    </Container>
  )
}