export default function Loading() {
  return (
    <div className="h-screen bg-[#111111] text-white flex flex-col overflow-hidden">
      <div className="h-16 bg-[#111111] border-b border-[#2A2A2A] flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3.5 pr-5 border-r border-[#2A2A2A] h-full">
          <div className="w-9 h-9 bg-[#1A1A1A] rounded-lg" />
          <div className="w-24 h-5 bg-[#1A1A1A] rounded" />
        </div>
        <div className="flex items-center gap-2 text-[12px]">
          <div className="w-12 h-4 bg-[#1A1A1A] rounded" />
          <div className="w-4 h-4 bg-[#1A1A1A] rounded" />
          <div className="w-48 h-4 bg-[#1A1A1A] rounded" />
        </div>
        <div className="w-96 h-10 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]" />
        <div className="flex items-center h-full pl-4 border-l border-[#2A2A2A]">
          <div className="w-8 h-8 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]" />
        </div>
      </div>

      <div className="flex-1 flex">
        <div className="w-1/4 border-r border-[#2A2A2A] bg-[#111111] flex flex-col">
          <div className="flex-1 flex flex-col items-center justify-center relative">
            <div className="absolute inset-0 opacity-10">
              <div className="w-full h-full" style={{
                backgroundImage: 'radial-gradient(circle, #2A2A2A 1px, transparent 1px)',
                backgroundSize: '20px 20px'
              }} />
            </div>
            <div className="text-center space-y-2 relative z-10">
              <div className="text-[10px] font-mono font-medium uppercase tracking-wider text-white/30">
                Market Chat
              </div>
              <div className="w-48 h-4 bg-[#1A1A1A] rounded" />
              <div className="w-32 h-3 bg-[#1A1A1A] rounded" />
            </div>
          </div>
          <div className="h-16 border-t border-[#2A2A2A] p-4">
            <div className="h-full bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]" />
          </div>
        </div>

        <div className="w-1/2 bg-[#111111] overflow-y-auto">
          <div className="divide-y divide-[#2A2A2A]">
            <div className="flex h-12 items-center px-6 border-b border-[#2A2A2A] bg-[#141414]">
              <div className="flex h-full flex-col justify-center flex-1">
                <div className="w-16 h-3 bg-[#1A1A1A] rounded mb-0.5" />
                <div className="w-32 h-4 bg-[#1A1A1A] rounded" />
              </div>
              <div className="flex items-center gap-2 text-[14px]">
                <div className="w-12 h-3 bg-[#1A1A1A] rounded" />
                <div className="w-8 h-4 bg-[#1A1A1A] rounded" />
                <div className="w-4 h-4 bg-[#1A1A1A] rounded" />
                <div className="w-16 h-3 bg-[#1A1A1A] rounded" />
                <div className="w-10 h-4 bg-[#1A1A1A] rounded" />
                <div className="w-24 h-4 bg-[#1A1A1A] rounded" />
              </div>
            </div>

            <div className="bg-[#141414]">
              <div className="h-12 flex items-center px-6 border-b border-[#2A2A2A]">
                <div className="w-24 h-4 bg-[#1A1A1A] rounded" />
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#1A1A1A]" />
                      <div className="w-48 h-4 bg-[#1A1A1A] rounded" />
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-24 h-2 bg-[#1A1A1A] rounded" />
                      <div className="w-8 h-4 bg-[#1A1A1A] rounded" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#1A1A1A]" />
                      <div className="w-40 h-4 bg-[#1A1A1A] rounded" />
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-2 bg-[#1A1A1A] rounded" />
                      <div className="w-8 h-4 bg-[#1A1A1A] rounded" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#141414]">
              <div className="h-12 flex items-center px-6 border-b border-[#2A2A2A]">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-[#1A1A1A] rounded" />
                  <div className="w-16 h-4 bg-[#1A1A1A] rounded" />
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <div className="w-32 h-3 bg-[#1A1A1A] rounded mb-3" />
                  <div className="space-y-2">
                    <div className="flex gap-3">
                      <div className="w-4 h-4 bg-[#1A1A1A] rounded shrink-0 mt-1" />
                      <div className="flex-1 space-y-2">
                        <div className="w-full h-4 bg-[#1A1A1A] rounded" />
                        <div className="w-3/4 h-4 bg-[#1A1A1A] rounded" />
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-4 h-4 bg-[#1A1A1A] rounded shrink-0 mt-1" />
                      <div className="flex-1 space-y-2">
                        <div className="w-full h-4 bg-[#1A1A1A] rounded" />
                        <div className="w-2/3 h-4 bg-[#1A1A1A] rounded" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#141414]">
              <div className="h-12 flex items-center px-6 border-b border-[#2A2A2A]">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-[#1A1A1A] rounded" />
                  <div className="w-32 h-4 bg-[#1A1A1A] rounded" />
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-2">
                  <div className="w-full h-4 bg-[#1A1A1A] rounded" />
                  <div className="w-5/6 h-4 bg-[#1A1A1A] rounded" />
                  <div className="w-4/5 h-4 bg-[#1A1A1A] rounded" />
                </div>
              </div>
            </div>

            <div className="bg-[#141414]">
              <div className="h-12 flex items-center px-6 border-b border-[#2A2A2A]">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-[#1A1A1A] rounded" />
                  <div className="w-20 h-4 bg-[#1A1A1A] rounded" />
                </div>
              </div>
              <div className="p-6">
                <div className="w-16 h-3 bg-[#1A1A1A] rounded mb-3" />
                <div className="space-y-2">
                  <div className="flex items-center justify-between py-1">
                    <div className="w-48 h-4 bg-[#1A1A1A] rounded" />
                    <div className="w-20 h-3 bg-[#1A1A1A] rounded" />
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <div className="w-40 h-4 bg-[#1A1A1A] rounded" />
                    <div className="w-16 h-3 bg-[#1A1A1A] rounded" />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#141414]">
              <div className="h-12 flex items-center justify-between px-6 border-b border-[#2A2A2A]">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-[#1A1A1A] rounded" />
                  <div className="w-24 h-4 bg-[#1A1A1A] rounded" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-6 bg-[#1A1A1A] rounded" />
                  <div className="w-20 h-6 bg-[#1A1A1A] rounded" />
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-1">
                  <div className="w-full h-3 bg-[#1A1A1A] rounded" />
                  <div className="w-full h-3 bg-[#1A1A1A] rounded" />
                  <div className="w-3/4 h-3 bg-[#1A1A1A] rounded" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="w-1/4 border-l border-[#2A2A2A] bg-[#111111] overflow-y-auto">
          <div className="flex flex-col divide-y divide-[#2A2A2A]">
            <div className="border-b border-[#2A2A2A]">
              <div className="flex items-center px-6 h-10 bg-[#111111]">
                <div className="w-28 h-3 bg-[#1A1A1A] rounded" />
              </div>
              <div className="px-6 py-4 bg-[#141414]">
                <div className="w-full h-20 bg-[#1A1A1A] rounded" />
              </div>
            </div>

            <div className="border-b border-[#2A2A2A]">
              <div className="flex items-center px-6 h-10 bg-[#111111]">
                <div className="w-28 h-3 bg-[#1A1A1A] rounded" />
              </div>
              <div className="px-6 py-4 bg-[#141414]">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex flex-col">
                    <div className="w-6 h-3 bg-[#1A1A1A] rounded mb-1" />
                    <div className="w-12 h-4 bg-[#1A1A1A] rounded" />
                  </div>
                  <div className="flex flex-col">
                    <div className="w-6 h-3 bg-[#1A1A1A] rounded mb-1" />
                    <div className="w-12 h-4 bg-[#1A1A1A] rounded" />
                  </div>
                  <div className="flex flex-col">
                    <div className="w-6 h-3 bg-[#1A1A1A] rounded mb-1" />
                    <div className="w-12 h-4 bg-[#1A1A1A] rounded" />
                  </div>
                  <div className="flex flex-col">
                    <div className="w-6 h-3 bg-[#1A1A1A] rounded mb-1" />
                    <div className="w-12 h-4 bg-[#1A1A1A] rounded" />
                  </div>
                </div>
              </div>
            </div>

            <div className="border-b border-[#2A2A2A]">
              <div className="flex items-center px-6 h-10 bg-[#111111]">
                <div className="w-28 h-3 bg-[#1A1A1A] rounded" />
              </div>
              <div className="px-6 py-4 bg-[#141414]">
                <div className="w-full h-40 bg-[#1A1A1A] rounded border border-[#2A2A2A]" />
              </div>
            </div>

            <div className="border-b border-[#2A2A2A]">
              <div className="flex items-center px-6 h-10 bg-[#111111]">
                <div className="w-20 h-3 bg-[#1A1A1A] rounded" />
              </div>
              <div className="px-6 py-4 bg-[#141414]">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-16 h-3 bg-[#1A1A1A] rounded" />
                  <div className="w-12 h-3 bg-[#1A1A1A] rounded" />
                </div>
                <div className="space-y-2">
                  <div className="group flex flex-col p-2 rounded-md bg-[#1A1A1A]/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-3 bg-[#1A1A1A] rounded" />
                        <div className="w-24 h-4 bg-[#1A1A1A] rounded" />
                      </div>
                      <div className="w-8 h-4 bg-[#1A1A1A] rounded" />
                    </div>
                    <div className="w-full h-1.5 bg-[#1A1A1A] rounded-full mt-1.5" />
                  </div>
                  <div className="group flex flex-col p-2 rounded-md bg-[#1A1A1A]/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-3 bg-[#1A1A1A] rounded" />
                        <div className="w-20 h-4 bg-[#1A1A1A] rounded" />
                      </div>
                      <div className="w-8 h-4 bg-[#1A1A1A] rounded" />
                    </div>
                    <div className="w-full h-1.5 bg-[#1A1A1A] rounded-full mt-1.5" />
                  </div>
                </div>
              </div>
            </div>

            <div className="border-b border-[#2A2A2A]">
              <div className="flex items-center px-6 h-10 bg-[#111111]">
                <div className="w-24 h-3 bg-[#1A1A1A] rounded" />
              </div>
              <div className="px-6 py-4 bg-[#141414]">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-0.5">
                    <div className="flex justify-between text-[10px] mb-1.5">
                      <div className="w-6 h-3 bg-[#1A1A1A] rounded" />
                      <div className="w-6 h-3 bg-[#1A1A1A] rounded" />
                    </div>
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex justify-between items-center px-1.5 py-0.5">
                        <div className="w-8 h-3 bg-[#1A1A1A] rounded" />
                        <div className="w-8 h-3 bg-[#1A1A1A] rounded" />
                      </div>
                    ))}
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex justify-between text-[10px] mb-1.5">
                      <div className="w-6 h-3 bg-[#1A1A1A] rounded" />
                      <div className="w-6 h-3 bg-[#1A1A1A] rounded" />
                    </div>
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex justify-between items-center px-1.5 py-0.5">
                        <div className="w-8 h-3 bg-[#1A1A1A] rounded" />
                        <div className="w-8 h-3 bg-[#1A1A1A] rounded" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="border-b border-[#2A2A2A]">
              <div className="flex items-center px-6 h-10 bg-[#111111]">
                <div className="w-16 h-3 bg-[#1A1A1A] rounded" />
              </div>
              <div className="bg-[#141414]">
                <div className="border-t border-[#2A2A2A] first:border-0">
                  <div className="w-full flex items-center justify-between px-6 py-3">
                    <div className="w-24 h-3 bg-[#1A1A1A] rounded" />
                    <div className="w-4 h-4 bg-[#1A1A1A] rounded" />
                  </div>
                </div>
                <div className="border-t border-[#2A2A2A]">
                  <div className="w-full flex items-center justify-between px-6 py-3">
                    <div className="w-16 h-3 bg-[#1A1A1A] rounded" />
                    <div className="w-4 h-4 bg-[#1A1A1A] rounded" />
                  </div>
                </div>
                <div className="border-t border-[#2A2A2A]">
                  <div className="w-full flex items-center justify-between px-6 py-3">
                    <div className="w-20 h-3 bg-[#1A1A1A] rounded" />
                    <div className="w-4 h-4 bg-[#1A1A1A] rounded" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
