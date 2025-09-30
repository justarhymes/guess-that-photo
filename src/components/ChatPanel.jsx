import { useEffect, useRef, useState } from "react";

export default function ChatPanel({
  messages,
  onSend,
  noTitle = false,
  disabled,
}) {
  const [text, setText] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!text.trim() || disabled) return;
    await onSend(text.trim());
    setText("");
  };

  return (
    <div
      className={`grid col-span-full h-full ${
        noTitle
          ? "grid-rows-[1fr_min-content]"
          : "grid-rows-[max-content_1fr_max-content]"
      } gap-3 rounded-2xl bg-white/5 p-4 text-white shadow-lg backdrop-blur`}>
      {noTitle === false && (
        <div className='text-lg font-dynapuff text-white'>Chat</div>
      )}
      <div className='scroll-shadow space-y-1 pr-1'>
        {messages.map((msg) => (
          <div key={msg.id}>
            {msg.userName !== "system" && (
              <div
                className={`inline-block text-sm mr-1 ${
                  msg.userName === "system"
                    ? "font-semibold text-white/70"
                    : "font-bold text-white"
                }`}>
                {msg.userName}
              </div>
            )}
            <div className='inline-block text-sm text-white/80'>{msg.text}</div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form className='flex gap-3' onSubmit={handleSubmit}>
        <input
          className='w-full rounded-xl border-2 border-white/40 bg-white/80 px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-500 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:cursor-not-allowed disabled:opacity-60'
          placeholder={
            disabled ? "Chat is paused while you are ready" : "Type a message"
          }
          value={text}
          onChange={(event) => setText(event.target.value)}
          disabled={disabled}
        />
        <button
          className='inline-flex items-center justify-center rounded-xl border-2 border-violet-900 bg-violet-600 px-4 py-2 font-dynapuff text-xs uppercase tracking-wide text-white shadow-md transition-colors duration-200 hover:bg-violet-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-violet-600 disabled:cursor-not-allowed disabled:opacity-60'
          type='submit'
          disabled={disabled || !text.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
