import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { success, error } from "@/lib/api";

export async function POST() {
  try {
    // Only allow seeding in development
    if (process.env.NODE_ENV === "production") {
      return error("Seeding not allowed in production", 403);
    }

    console.log("Seeding database...");

    // Clean existing data
    await prisma.rideRegistration.deleteMany();
    await prisma.userBadge.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.motorcycle.deleteMany();
    await prisma.blogPost.deleteMany();
    await prisma.ride.deleteMany();
    await prisma.badge.deleteMany();
    await prisma.guideline.deleteMany();
    await prisma.content.deleteMany();
    await prisma.user.deleteMany();

    // Create Badge Tiers
    const badges = await Promise.all([
      prisma.badge.create({
        data: { tier: "SILVER", name: "Silver Rider", description: "Completed 1,000 km with T2W. The journey has just begun!", minKm: 1000, icon: "shield", color: "#C0C0C0" },
      }),
      prisma.badge.create({
        data: { tier: "GOLD", name: "Gold Rider", description: "Completed 5,000 km with T2W. A seasoned road warrior!", minKm: 5000, icon: "award", color: "#FFD700" },
      }),
      prisma.badge.create({
        data: { tier: "PLATINUM", name: "Platinum Rider", description: "Completed 15,000 km with T2W. The road knows your name!", minKm: 15000, icon: "star", color: "#E5E4E2" },
      }),
      prisma.badge.create({
        data: { tier: "DIAMOND", name: "Diamond Rider", description: "Completed 30,000 km with T2W. A legend in the making!", minKm: 30000, icon: "gem", color: "#B9F2FF" },
      }),
      prisma.badge.create({
        data: { tier: "ACE", name: "Ace Rider", description: "Completed 50,000 km with T2W. Master of the open road!", minKm: 50000, icon: "zap", color: "#FF6B35" },
      }),
      prisma.badge.create({
        data: { tier: "CONQUEROR", name: "Conqueror", description: "Completed 100,000 km with T2W. You have conquered every horizon!", minKm: 100000, icon: "crown", color: "#9B59B6" },
      }),
    ]);

    const silverBadge = badges.find((b) => b.tier === "SILVER")!;
    const goldBadge = badges.find((b) => b.tier === "GOLD")!;

    // Create Users
    const pw = await hashPassword("password123");

    const adminUser = await prisma.user.create({
      data: { name: "Arjun Mehta", email: "arjun@t2w.com", phone: "+91 98765 00001", password: pw, role: "admin", isApproved: true, city: "Mumbai", ridingExperience: "veteran", totalKm: 25000, ridesCompleted: 30, joinDate: new Date("2023-01-10") },
    });

    const adminUser2 = await prisma.user.create({
      data: { name: "Priya Sharma", email: "priya@t2w.com", phone: "+91 98765 00002", password: pw, role: "admin", isApproved: true, city: "Pune", ridingExperience: "veteran", totalKm: 18000, ridesCompleted: 22, joinDate: new Date("2023-01-15") },
    });

    const rohan = await prisma.user.create({
      data: { name: "Rohan Kapoor", email: "rohan@example.com", phone: "+91 98765 43210", password: pw, role: "rider", isApproved: true, city: "Mumbai", ridingExperience: "experienced", totalKm: 8450, ridesCompleted: 12, joinDate: new Date("2024-06-15") },
    });

    const vikram = await prisma.user.create({
      data: { name: "Vikram Singh", email: "vikram@example.com", phone: "+91 98765 00004", password: pw, role: "rider", isApproved: true, city: "Delhi", ridingExperience: "veteran", totalKm: 15500, ridesCompleted: 18, joinDate: new Date("2023-03-20") },
    });

    const kiran = await prisma.user.create({
      data: { name: "Kiran Patel", email: "kiran@example.com", phone: "+91 98765 00005", password: pw, role: "rider", isApproved: true, city: "Bangalore", ridingExperience: "experienced", totalKm: 6200, ridesCompleted: 8, joinDate: new Date("2023-06-01") },
    });

    const pendingUser1 = await prisma.user.create({
      data: { name: "Amit Kumar", email: "amit@example.com", phone: "+91 99887 76655", password: pw, role: "rider", isApproved: false, city: "Delhi", ridingExperience: "intermediate", joinDate: new Date("2026-02-22") },
    });

    const pendingUser2 = await prisma.user.create({
      data: { name: "Sneha Kulkarni", email: "sneha@example.com", phone: "+91 88776 65544", password: pw, role: "rider", isApproved: false, city: "Pune", ridingExperience: "beginner", joinDate: new Date("2026-02-23") },
    });

    const pendingUser3 = await prisma.user.create({
      data: { name: "Rajesh Nair", email: "rajesh@example.com", phone: "+91 77665 54433", password: pw, role: "rider", isApproved: false, city: "Bangalore", ridingExperience: "veteran", joinDate: new Date("2026-02-24") },
    });

    // Motorcycles
    await prisma.motorcycle.createMany({
      data: [
        { make: "Royal Enfield", model: "Himalayan 450", year: 2025, cc: 450, color: "Slate Himalayan Salt", nickname: "Storm", userId: rohan.id },
        { make: "KTM", model: "390 Adventure", year: 2024, cc: 373, color: "Orange", nickname: "Blaze", userId: rohan.id },
        { make: "Bajaj", model: "Dominar 400", year: 2024, cc: 373, color: "Aurora Green", userId: pendingUser1.id },
        { make: "Royal Enfield", model: "Classic 350", year: 2023, cc: 349, color: "Signals", userId: pendingUser2.id },
        { make: "BMW", model: "G 310 GS", year: 2025, cc: 313, color: "Cosmic Black", userId: pendingUser3.id },
      ],
    });

    // User badges for Rohan
    await prisma.userBadge.createMany({
      data: [
        { userId: rohan.id, badgeId: silverBadge.id, earnedDate: new Date("2024-09-20") },
        { userId: rohan.id, badgeId: goldBadge.id, earnedDate: new Date("2025-05-15") },
      ],
    });

    // Create Rides
    const rides = await Promise.all([
      prisma.ride.create({
        data: {
          title: "Coastal Sunrise Sprint", rideNumber: "T2W-2026-001", type: "day", status: "upcoming",
          startDate: new Date("2026-03-15"), endDate: new Date("2026-03-15"),
          startLocation: "Mumbai, Maharashtra", endLocation: "Alibaug, Maharashtra",
          route: JSON.stringify(["Mumbai", "Panvel", "Pen", "Alibaug"]),
          distanceKm: 120, maxRiders: 30, difficulty: "easy",
          description: "A scenic day ride along the coastal highway from Mumbai to Alibaug. Perfect for beginners and experienced riders alike. Enjoy breathtaking ocean views and stop for fresh seafood along the way.",
          highlights: JSON.stringify(["Ocean-side highways", "Seafood lunch stop", "Fort visit", "Sunset photo point"]),
          fee: 500, leadRider: "Arjun Mehta", sweepRider: "Vikram Singh",
        },
      }),
      prisma.ride.create({
        data: {
          title: "Western Ghats Explorer", rideNumber: "T2W-2026-002", type: "weekend", status: "upcoming",
          startDate: new Date("2026-04-05"), endDate: new Date("2026-04-06"),
          startLocation: "Pune, Maharashtra", endLocation: "Mahabaleshwar, Maharashtra",
          route: JSON.stringify(["Pune", "Panchgani", "Mahabaleshwar", "Tapola", "Pune"]),
          distanceKm: 340, maxRiders: 25, difficulty: "moderate",
          description: "A thrilling weekend ride through the magnificent Western Ghats. Wind through hairpin bends, misty mountain passes, and lush green valleys. Camp under the stars at Tapola lake.",
          highlights: JSON.stringify(["Mountain passes", "Lake-side camping", "Strawberry farms", "Valley viewpoints"]),
          fee: 2500, leadRider: "Priya Sharma", sweepRider: "Rahul Desai",
        },
      }),
      prisma.ride.create({
        data: {
          title: "Rajasthan Royal Circuit", rideNumber: "T2W-2026-003", type: "multi-day", status: "upcoming",
          startDate: new Date("2026-05-01"), endDate: new Date("2026-05-05"),
          startLocation: "Jaipur, Rajasthan", endLocation: "Udaipur, Rajasthan",
          route: JSON.stringify(["Jaipur", "Pushkar", "Jodhpur", "Ranakpur", "Udaipur"]),
          distanceKm: 780, maxRiders: 20, difficulty: "moderate",
          description: "Experience the grandeur of Rajasthan on this epic 5-day ride. From the Pink City to the City of Lakes, ride through desert landscapes, ancient forts, and colorful villages.",
          highlights: JSON.stringify(["Desert riding", "Fort visits", "Cultural immersion", "Lake Palace views"]),
          fee: 12000, leadRider: "Arjun Mehta", sweepRider: "Kiran Patel",
        },
      }),
      prisma.ride.create({
        data: {
          title: "Konkan Coast Cruise", rideNumber: "T2W-2025-048", type: "weekend", status: "completed",
          startDate: new Date("2026-01-20"), endDate: new Date("2026-01-21"),
          startLocation: "Mumbai, Maharashtra", endLocation: "Goa",
          route: JSON.stringify(["Mumbai", "Chiplun", "Ratnagiri", "Ganpatipule", "Goa"]),
          distanceKm: 590, maxRiders: 25, difficulty: "moderate",
          description: "An unforgettable ride along the Konkan coastline. Winding roads through coconut groves, hidden beaches, and charming coastal towns.",
          highlights: JSON.stringify(["Coastal roads", "Hidden beaches", "Alphonso mango country", "Ancient temples"]),
          fee: 3500, leadRider: "Vikram Singh", sweepRider: "Priya Sharma",
        },
      }),
      prisma.ride.create({
        data: {
          title: "Spiti Valley Expedition", rideNumber: "T2W-2025-042", type: "expedition", status: "completed",
          startDate: new Date("2025-09-10"), endDate: new Date("2025-09-20"),
          startLocation: "Manali, Himachal Pradesh", endLocation: "Manali, Himachal Pradesh",
          route: JSON.stringify(["Manali", "Rohtang Pass", "Kaza", "Ki Monastery", "Chandratal", "Manali"]),
          distanceKm: 950, maxRiders: 15, difficulty: "extreme",
          description: "The ultimate Himalayan adventure. Ride through the barren yet breathtaking landscapes of Spiti Valley, crossing some of the highest motorable passes in the world.",
          highlights: JSON.stringify(["High-altitude passes", "Ancient monasteries", "Chandratal Lake", "Star gazing"]),
          fee: 25000, leadRider: "Arjun Mehta", sweepRider: "Vikram Singh",
        },
      }),
      prisma.ride.create({
        data: {
          title: "Nilgiri Mountain Trail", rideNumber: "T2W-2025-045", type: "multi-day", status: "completed",
          startDate: new Date("2025-11-15"), endDate: new Date("2025-11-18"),
          startLocation: "Bangalore, Karnataka", endLocation: "Ooty, Tamil Nadu",
          route: JSON.stringify(["Bangalore", "Mysore", "Bandipur", "Mudumalai", "Ooty"]),
          distanceKm: 420, maxRiders: 20, difficulty: "moderate",
          description: "Ride through wildlife sanctuaries and tea plantations on this scenic Southern trail. Spot elephants in the wild and breathe in the mountain air.",
          highlights: JSON.stringify(["Wildlife sightings", "Tea plantations", "36 hairpin bends", "Colonial architecture"]),
          fee: 8000, leadRider: "Priya Sharma", sweepRider: "Rahul Desai",
        },
      }),
      prisma.ride.create({
        data: {
          title: "Coorg Coffee Trail", rideNumber: "T2W-2025-047", type: "weekend", status: "completed",
          startDate: new Date("2025-12-12"), endDate: new Date("2025-12-13"),
          startLocation: "Bangalore, Karnataka", endLocation: "Coorg, Karnataka",
          route: JSON.stringify(["Bangalore", "Kushalnagar", "Madikeri", "Abbey Falls", "Coorg"]),
          distanceKm: 280, maxRiders: 22, difficulty: "easy",
          description: "A relaxing weekend ride through the aromatic coffee estates of Coorg. Perfect blend of twisty roads and serene nature.",
          highlights: JSON.stringify(["Coffee plantations", "Abbey Falls", "Misty valleys", "Local cuisine"]),
          fee: 2000, leadRider: "Kiran Patel", sweepRider: "Rahul Desai",
        },
      }),
    ]);

    // Ride registrations
    const completedRides = rides.filter((r) => r.status === "completed");
    for (const ride of completedRides) {
      for (const user of [rohan, vikram, kiran]) {
        await prisma.rideRegistration.create({
          data: {
            userId: user.id, rideId: ride.id, agreedIndemnity: true,
            confirmationCode: `${ride.rideNumber}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
          },
        });
      }
    }

    const upcomingRides = rides.filter((r) => r.status === "upcoming");
    for (const ride of upcomingRides) {
      await prisma.rideRegistration.create({
        data: {
          userId: rohan.id, rideId: ride.id, agreedIndemnity: true,
          confirmationCode: `${ride.rideNumber}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        },
      });
    }

    // Blog Posts
    await prisma.blogPost.createMany({
      data: [
        { title: "The Art of Cornering: Mastering Twisty Mountain Roads", excerpt: "Learn the techniques that separate confident riders from cautious ones on challenging mountain roads. From body positioning to throttle control.", content: "", authorId: adminUser.id, authorName: "Arjun Mehta", publishDate: new Date("2026-02-10"), tags: JSON.stringify(["riding-tips", "technique", "mountains"]), type: "official", isVlog: false, readTime: 8, likes: 142 },
        { title: "Spiti Diaries: 10 Days Above the Clouds", excerpt: "A rider's personal account of the T2W Spiti Valley Expedition. From altitude sickness to soul-stirring sunrises at 15,000 feet.", content: "", authorId: adminUser2.id, authorName: "Priya Sharma", publishDate: new Date("2026-01-28"), tags: JSON.stringify(["travel", "spiti", "expedition", "adventure"]), type: "personal", isVlog: false, readTime: 12, likes: 289 },
        { title: "Gear Guide 2026: Essential Riding Equipment", excerpt: "Our comprehensive guide to the best riding gear available in India. From helmets to boots, we cover everything you need for a safe ride.", content: "", authorName: "T2W Team", publishDate: new Date("2026-02-15"), tags: JSON.stringify(["gear", "safety", "guide"]), type: "official", isVlog: false, readTime: 15, likes: 356 },
        { title: "Night Riding: Tips for Safe After-Dark Adventures", excerpt: "Night riding can be magical but dangerous. Here are essential tips from our veteran riders on staying safe while enjoying the moonlit roads.", content: "", authorId: vikram.id, authorName: "Vikram Singh", publishDate: new Date("2026-01-15"), tags: JSON.stringify(["safety", "tips", "night-riding"]), type: "official", isVlog: true, videoUrl: "https://youtube.com/watch?v=example", readTime: 6, likes: 198 },
        { title: "My First T2W Ride: A Newbie's Experience", excerpt: "I was nervous, excited, and everything in between. Here's what my first group ride with Tales on 2 Wheels was really like.", content: "", authorName: "Sneha Kulkarni", publishDate: new Date("2026-02-01"), tags: JSON.stringify(["experience", "first-ride", "community"]), type: "personal", isVlog: false, readTime: 5, likes: 175 },
      ],
    });

    // Notifications
    await prisma.notification.createMany({
      data: [
        { title: "Coastal Sunrise Sprint - Registration Open!", message: "Only 12 spots remaining for the Mumbai to Alibaug day ride on March 15th. Register now!", type: "ride", date: new Date("2026-02-22"), isRead: false },
        { title: "New Blog Post Published", message: "Check out our latest gear guide for 2026. Updated recommendations from veteran riders.", type: "info", date: new Date("2026-02-15"), isRead: false },
        { title: "Western Ghats Explorer - Almost Full!", message: "Only 3 spots left for the Western Ghats weekend ride in April. Don't miss out!", type: "warning", date: new Date("2026-02-20"), isRead: false },
        { title: "Ride Photos Uploaded", message: "Photos from the Konkan Coast Cruise are now available in the gallery. Tag yourself!", type: "success", date: new Date("2026-02-18"), isRead: true },
      ],
    });

    // Guidelines
    await prisma.guideline.createMany({
      data: [
        { title: "Pre-Ride Briefing", content: "Every T2W ride begins with a mandatory pre-ride briefing. This includes route overview, fuel stop planning, emergency protocols, hand signals review, and rider pairing assignments. Arrive at least 30 minutes before the scheduled departure time.", category: "group", icon: "clipboard" },
        { title: "Formation Riding", content: "T2W follows staggered formation on highways and single file on mountain roads. Maintain a 2-second gap from the rider directly ahead. The lead rider sets the pace; never overtake the lead rider. The sweep rider stays at the back at all times.", category: "group", icon: "users" },
        { title: "Hand Signals", content: "All T2W riders must know the standard hand signals: left turn (left arm extended), right turn (left arm bent up at 90 degrees), slow down (left arm extended down, palm facing back), stop (left arm bent down at 90 degrees), hazard on road (pointing to the ground), and single file (left index finger raised).", category: "group", icon: "hand" },
        { title: "Mandatory Safety Gear", content: "All riders must wear: ISI/ECE certified full-face helmet, riding jacket with armor, riding gloves, riding boots that cover ankles, and riding pants. Hi-visibility vests are recommended for dawn/dusk rides. Non-compliance will result in exclusion from the ride.", category: "safety", icon: "shield" },
        { title: "Bike Preparation", content: "Before every ride, perform T-CLOCS check: Tires & Wheels (pressure, tread), Controls (levers, cables, throttle), Lights & Electrics (headlight, tail, indicators), Oil & Fluids (engine oil, coolant, brake fluid), Chassis (frame, suspension), and Stands (side stand, center stand).", category: "maintenance", icon: "wrench" },
        { title: "Cornering Techniques", content: "Slow in, fast out. Reduce speed before entering a corner, not during. Look through the corner to where you want to go. Lean the bike, not your body, for better control. Avoid braking mid-corner. Gradually roll on throttle as you exit the turn.", category: "general", icon: "navigation" },
        { title: "Emergency Protocol", content: "In case of breakdown or accident: Pull over safely to the shoulder. Turn on hazard lights. Place a warning triangle 50m behind the bike. Inform the sweep rider immediately. Do not attempt to move an injured rider. Call emergency services if needed. The sweep rider carries a first-aid kit.", category: "safety", icon: "alert-triangle" },
        { title: "Fuel Management", content: "Always start a ride with a full tank. Know your bike's range and plan fuel stops accordingly. The ride leader will announce fuel stops. If you notice your fuel is running low, signal the group to stop. Carry a 1-liter emergency fuel reserve on long rides.", category: "general", icon: "fuel" },
      ],
    });

    // Content items
    await prisma.content.createMany({
      data: [
        { title: "T2W Logo and Brand Assets", type: "Brand", status: "published", lastUpdated: new Date("2025-12-01") },
        { title: "Official Ride Posters 2026", type: "Media", status: "published", lastUpdated: new Date("2026-01-15") },
        { title: "Riding Guidelines Document", type: "Document", status: "published", lastUpdated: new Date("2026-02-10") },
        { title: "T2W Merchandise Catalog", type: "Media", status: "draft", lastUpdated: new Date("2026-02-20") },
      ],
    });

    return success({
      message: "Database seeded successfully!",
      credentials: {
        admins: ["arjun@t2w.com / password123", "priya@t2w.com / password123"],
        riders: ["rohan@example.com / password123", "vikram@example.com / password123", "kiran@example.com / password123"],
        pending: ["amit@example.com / password123", "sneha@example.com / password123", "rajesh@example.com / password123"],
      },
    });
  } catch (err) {
    console.error("Seed error:", err);
    return error("Failed to seed database: " + (err instanceof Error ? err.message : "Unknown error"), 500);
  }
}
