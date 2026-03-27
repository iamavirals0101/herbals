import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Customer from './models/Customer.js';
import User from './models/User.js';

dotenv.config();

await mongoose.connect(process.env.MONGODB_URI);

async function seed() {
  try {
    const user = await User.findOne({ email: 'atulknag@gmail.com' });
    if (!user) throw new Error('User not found!');

    const customers = [
      {
        name: 'Atul Nag',
        email: 'atulknag@gmail.com',
        phone: '1234567890',
        spend: 10000,
        visits: 5,
        lastOrderDate: new Date('2025-05-01'),
        createdBy: user._id
      },
      {
        name: 'Tanvi Nag',
        email: 'crazyatulya@gmail.com',
        phone: '0987654321',
        spend: 15000,
        visits: 10,
        lastOrderDate: new Date('2024-04-15'),
        createdBy: user._id
      },
      ...Array.from({ length: 50 }).map((_, i) => {
        const names = [
          'Ansh Chatterjee', 'Vivaan Joshi', 'Ishita Yadav', 'Tanish Kapoor', 'Ritika Agarwal',
          'Saanvi Mehta', 'Aarav Nair', 'Kavya Bansal', 'Dev Sharma', 'Meera Singh',
          'Ayaan Bhatt', 'Diya Iyer', 'Reyansh Reddy', 'Anika Verma', 'Kabir Shah',
          'Mira Menon', 'Yuvraj Dubey', 'Aisha Pathak', 'Vihaan Sethi', 'Ananya Goyal',
          'Arjun Trivedi', 'Riya Rajput', 'Shaurya Malhotra', 'Prisha Jain', 'Laksh Khurana',
          'Ira Deshmukh', 'Neil Oberoi', 'Aadya Kaur', 'Siddharth Rao', 'Naina Das',
          'Om Tiwari', 'Kiara Shetty', 'Aditya Chauhan', 'Avni Pillai', 'Aryan Dey',
          'Sneha Bhattacharya', 'Hrithik Saluja', 'Mahira Kaul', 'Manav Joshi', 'Nikita Sen',
          'Krishna Varma', 'Pihu Mathur', 'Aman Bhargava', 'Sakshi Thakur', 'Ved Saxena',
          'Anvi Rawal', 'Ranveer Ahuja', 'Kritika Jindal', 'Parth Vora', 'Charvi Naik'
        ];

        const name = names[i % names.length];
        const email = `${name.toLowerCase().replace(/\s+/g, '')}${i}@example.com`;
        const phone = `9${Math.floor(100000000 + Math.random() * 900000000)}`;
        const spend = Math.floor(2000 + Math.random() * 15000);
        const visits = Math.floor(1 + Math.random() * 15);
        const lastOrderDate = new Date(Date.now() - Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 365));

        return {
          name,
          email,
          phone,
          spend,
          visits,
          lastOrderDate,
          createdBy: user._id
        };
      })
    ];

    await Customer.insertMany(customers);
    console.log('Customers seeded!');
  } catch (err) {
    console.error('Seeding error:', err);
  } finally {
    mongoose.disconnect();
  }
}

seed();
