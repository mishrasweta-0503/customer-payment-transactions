import { PrismaClient, Status, RiskLevel } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const Statuses: Status[] = [Status.DRAFT, Status.PENDING_REVIEW, Status.PROCESSING, Status.COMPLETED, Status.FAILED, Status.CANCELLED]

const RISK_LEVELS: RiskLevel[] = [RiskLevel.LOW, RiskLevel.MEDIUM, RiskLevel.HIGH];

const currencies = ['USD', 'INR', 'AED', 'SGD']

const FIRST_NAMES = ['Sweta', 'Jane', 'Joe', 'Jennifer', 'Tom', 'Chris','Benjamin', 'Lucas', 'Kate','Nicole','Lisa','David','Niel','Sophia', 'Noah', 'Ava', 'Tariq', 'Fatima', 'Zaid', 'Aisha', 'Vikram', 'Ananya']

const LAST_NAMES = ['Mishra', 'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller','Davis', 'Rodriguez', 'Martinez', 'Khan', 'Ahmed', 'Sharma', 'Patel']

const anyItem = <T>(arr:T[]):T => {
    return arr[Math.floor(Math.random() * arr.length)]
}

const anyRandomAmount = (min: number, max: number): string => {
    return (Math.random() * (max - min) + min).toFixed(2);
}

const anyRandomDate = (start: Date, end: Date): Date => {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  };

async function main(){
    await prisma.transaction.deleteMany(); //to wipe existing data so that seed script can run multiple times w/o inflating db
    const TOTAL_RECORDS = 2500;
    const BATCH_SIZE = 500;
    for (let i = 0; i < TOTAL_RECORDS; i += BATCH_SIZE) {
        const transactions = [];
        for (let j = 0; j < BATCH_SIZE; j++) {
            const sourceCurrency = anyItem(currencies);
            let destinationCurrency = anyItem(currencies);
            while (destinationCurrency === sourceCurrency) {
                destinationCurrency = anyItem(currencies);
            }

            const sourceAmount = Number(anyRandomAmount(50, 10000));
            const rate = Number((Math.random() * (1.5 - 0.2) + 0.2).toFixed(4));;
            const destAmount = (sourceAmount * rate).toFixed(2);
            const status = anyItem(Statuses);

            transactions.push({
                customerId: `CUST_${Math.floor(Math.random() * 200) + 100}`,
                beneficiaryName: `${anyItem(FIRST_NAMES)} ${anyItem(LAST_NAMES)}`,
                beneficiaryAccount: `ACC${Math.floor(100000000 + Math.random() * 900000000)}`,
                sourceCurrency,
                destinationCurrency,
                sourceAmount: sourceAmount.toFixed(2),
                destinationAmount: destAmount,
                exchangeRate: rate.toString(),
                status,
                riskLevel: status === Status.DRAFT ? null : anyItem(RISK_LEVELS),
                createdAt: anyRandomDate(new Date(2026, 0, 1), new Date()),
            });
        }
        await prisma.transaction.createMany({
            data: transactions,
        });
        console.log(`Seeded ${i + BATCH_SIZE}/${TOTAL_RECORDS} transactions...`);
    }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });