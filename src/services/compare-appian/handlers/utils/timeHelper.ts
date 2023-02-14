export function secondsBetweenDates(dateToCompare: Date) {
  const today = new Date().getTime();
  const comparisonDate = new Date(dateToCompare).getTime();

  return Math.floor((today - comparisonDate) / 1000); // from ms to sec we div by 1000
}
