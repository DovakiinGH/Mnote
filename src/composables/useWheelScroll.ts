export const useWheelScroll = () => {
  const onTabWheel = (e: WheelEvent) => {
    const wrap = (e.currentTarget as HTMLElement)
      ?.querySelector('.el-scrollbar__wrap') as HTMLElement | null
    if (!wrap) return
    wrap.scrollLeft += e.deltaY
  }

  const onTitleWheel = (e: WheelEvent) => {
    const root = e.currentTarget as HTMLElement | null
    if (!root) return
    const inputEl = root.querySelector('input') as HTMLInputElement | null
    if (!inputEl) return
    inputEl.scrollLeft += e.deltaY
  }

  return { onTabWheel, onTitleWheel }
}