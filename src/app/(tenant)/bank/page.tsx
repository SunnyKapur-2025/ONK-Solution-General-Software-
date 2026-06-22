'use client'
import BankReconciliation from '@/components/bank/BankReconciliation'

export default function BankPage() {
  return (
    <BankReconciliation
      bankAccountId=""
      bankAccountName="Bank Account"
      onImport={async () => {}}
      onReconcile={async () => {}}
      onCreateVoucher={async () => {}}
    />
  )
}
