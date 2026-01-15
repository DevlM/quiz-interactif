const html = document.querySelector("body")

export const toggledarkmode = () => {
    // if (html.classList.contains("dark")) {
    //     html.classList.remove("dark")
    // } else {
    //     html.classList.add("dark")
    // }
    html.classList.toggle("dark");
}