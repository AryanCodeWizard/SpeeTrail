/**
 * Minimum transactions debt simplification.
 *
 * Problem: given N people with net balances, find the minimum
 * number of payments to settle all debts.
 *
 * Algorithm:
 *   1. Separate into creditors (net > 0) and debtors (net < 0)
 *   2. Sort both descending by absolute value
 *   3. Greedily pair largest creditor with largest debtor
 *   4. The smaller of the two is fully settled, the remainder
 *      stays in the list for the next pairing
 *   5. Repeat until all balances are zero
 *
 * Example (hand-verifiable):
 *   Aisha  net: +500   (owed money)
 *   Rohan  net: -300   (owes money)
 *   Priya  net: -200   (owes money)
 *
 *   Pair Aisha(+500) with Rohan(-300):
 *     Rohan pays Aisha ₹300. Rohan settled. Aisha now +200.
 *   Pair Aisha(+200) with Priya(-200):
 *     Priya pays Aisha ₹200. Both settled.
 *
 *   Result: 2 transactions instead of potentially 3+.
 *
 * Time complexity: O(n log n) — dominated by sort.
 * For flat expenses with ≤10 people this is instant.
 */
function simplifyDebts(roundedBalances, userMap) {
  // Build working arrays from balance map
  // Filter out zero balances — nothing to settle
  const creditors = []  // people who are owed money
  const debtors   = []  // people who owe money

  for (const [userId, data] of Object.entries(roundedBalances)) {
    if (data.net > 0.005) {
      creditors.push({ userId, name: data.user?.name, amount: data.net })
    } else if (data.net < -0.005) {
      debtors.push({ userId, name: data.user?.name, amount: Math.abs(data.net) })
    }
  }

  // Sort descending — largest amounts paired first
  creditors.sort((a, b) => b.amount - a.amount)
  debtors.sort((a, b)   => b.amount - a.amount)

  const transactions = []

  let i = 0  // pointer into creditors
  let j = 0  // pointer into debtors

  while (i < creditors.length && j < debtors.length) {
    const creditor = creditors[i]
    const debtor   = debtors[j]

    // The payment is the smaller of the two amounts
    const payment = Math.min(creditor.amount, debtor.amount)

    transactions.push({
      from:   { id: debtor.userId,   name: debtor.name },
      to:     { id: creditor.userId, name: creditor.name },
      amount: +payment.toFixed(2)
    })

    // Reduce both balances by the payment
    creditor.amount = +(creditor.amount - payment).toFixed(2)
    debtor.amount   = +(debtor.amount   - payment).toFixed(2)

    // Advance pointer for whichever side is fully settled
    if (creditor.amount < 0.005) i++
    if (debtor.amount   < 0.005) j++
  }

  return transactions
}

export { simplifyDebts }