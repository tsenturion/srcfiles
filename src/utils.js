

export function darkenColor(color) {
  if (!color) {
    return "#FFFFFF"
  }
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);

  const darkenedR = Math.floor(r / 2).toString(16).padStart(2, '0');
  const darkenedG = Math.floor(g / 2).toString(16).padStart(2, '0');
  const darkenedB = Math.floor(b / 2).toString(16).padStart(2, '0');

  return `#${darkenedR}${darkenedG}${darkenedB}`;
}

export function toMS(data) {
  if (typeof data == "number" || typeof data == "int") {
    return data;
  } else {

    return data.getTime();
  }
}

export function genUID() {
  return Math.ceil(Math.random() * (1000000 - 10000) + 10000);
}
