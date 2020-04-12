window.onload = () => {
    const canvas = document.getElementById("canvas")
    if　(canvas == null || !(canvas instanceof HTMLCanvasElement)){
        alert("canvas not found")
        return
    }
    const context = canvas.getContext('2d')
    if　(context == null){
        alert("context2d not found")
        return
    }
    canvas.addEventListener('click', (ev : MouseEvent) => {
        const x = ev.clientX - canvas.offsetLeft
        const y = ev.clientY - canvas.offsetTop
    }, false)
}