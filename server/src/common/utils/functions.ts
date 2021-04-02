export function debounce(func: Function, wait: number) {
    let timeoutId: ReturnType<typeof setTimeout>;
    return function (this: any, ...args: any[]) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(async () => {
            await func.apply(this, args)
        }, wait);
    }
}