import asyncio
import uuid
from datetime import datetime, timedelta, timezone
import structlog

from app.database.session import AsyncSessionLocal, engine
from app.core.security import get_password_hash
from app.domain.entities.base import Base
from app.domain.entities.user import User, UserRole, RefreshToken
from app.domain.entities.report import BinReport, WasteReport, PickupSchedule, ReportStatus

logger = structlog.get_logger()


async def seed_database() -> None:
    """
    Seeds initial system-wide reference and mock database entries for the Hyderabad municipality.
    """
    await logger.ainfo("Starting database seeding process...")
    
    async with AsyncSessionLocal() as session:
        try:
            # ==========================================
            # 1. Seed Core Role Personas (Idempotent)
            # ==========================================
            hashed_pw = get_password_hash("password123")
            
            users_to_seed = [
                {
                    "email": "citizen@ecotrack.in",
                    "display_name": "Ramesh Kumar",
                    "role": UserRole.CITIZEN,
                    "city": "Hyderabad",
                    "address": "Flat 302, Gachibowli Heights",
                    "points": 350,
                    "streak_count": 5
                },
                {
                    "email": "worker@ecotrack.in",
                    "display_name": "Venkatesh Rao",
                    "role": UserRole.WORKER,
                    "city": "Hyderabad",
                    "address": "Kothaguda Municipal Quarters",
                    "points": 0,
                    "streak_count": 0
                },
                {
                    "email": "driver@ecotrack.in",
                    "display_name": "Mohammad Ali",
                    "role": UserRole.DRIVER,
                    "city": "Hyderabad",
                    "address": "Begumpet Depot Housing",
                    "points": 0,
                    "streak_count": 0
                },
                {
                    "email": "admin@ecotrack.in",
                    "display_name": "Srinivas Reddy",
                    "role": UserRole.ADMIN,
                    "city": "Hyderabad",
                    "address": "GHMC Headquarters, Tank Bund",
                    "points": 0,
                    "streak_count": 0
                },
                {
                    "email": "superadmin@ecotrack.in",
                    "display_name": "Priyah Sharma",
                    "role": UserRole.SUPER_ADMIN,
                    "city": "Hyderabad",
                    "address": "IT & Municipal Administration Secretariat",
                    "points": 0,
                    "streak_count": 0
                },
            ]

            seeded_users_map = {}
            
            for u_data in users_to_seed:
                # Check if user already exists
                from sqlalchemy import select
                stmt = select(User).where(User.email == u_data["email"])
                res = await session.execute(stmt)
                existing_user = res.scalar_one_or_none()
                
                if not existing_user:
                    user = User(
                        email=u_data["email"],
                        hashed_password=hashed_pw,
                        display_name=u_data["display_name"],
                        role=u_data["role"],
                        city=u_data["city"],
                        address=u_data["address"],
                        points=u_data["points"],
                        streak_count=u_data["streak_count"],
                        is_email_verified=True
                    )
                    session.add(user)
                    await session.flush()  # Populates user.id
                    seeded_users_map[u_data["role"]] = user
                    await logger.ainfo("Seeded user role", role=u_data["role"].value, email=u_data["email"])
                else:
                    seeded_users_map[u_data["role"]] = existing_user
                    await logger.adebug("User already exists, skipping", email=u_data["email"])

            # Save citizen reference for reporting relations
            citizen_user = seeded_users_map.get(UserRole.CITIZEN)

            # ==========================================
            # 2. Seed Hyderabad Area Pickup Schedules
            # ==========================================
            schedules_to_seed = [
                {
                    "area_name": "Jubilee Hills Road No. 36",
                    "city": "Hyderabad",
                    "collector_name": "Swachh Doot Team A",
                    "time_slot": "06:30 AM - 08:30 AM",
                    "frequency": "Daily (Wet & Dry Segregated)"
                },
                {
                    "area_name": "Madhapur (Hitec City)",
                    "city": "Hyderabad",
                    "collector_name": "Hitec Eco Clean",
                    "time_slot": "07:00 AM - 09:30 AM",
                    "frequency": "Daily (Dry Recyclables focus)"
                },
                {
                    "area_name": "Banjara Hills Road No. 12",
                    "city": "Hyderabad",
                    "collector_name": "Banjara Swachh Team",
                    "time_slot": "06:00 AM - 08:00 AM",
                    "frequency": "Daily"
                },
                {
                    "area_name": "Gachibowli Financial District",
                    "city": "Hyderabad",
                    "collector_name": "Financial Dist Sanitation Team",
                    "time_slot": "08:00 AM - 11:00 AM",
                    "frequency": "Daily (E-Waste special drive on Saturdays)"
                },
                {
                    "area_name": "Begumpet Sector 3",
                    "city": "Hyderabad",
                    "collector_name": "Secunderabad Circle Team",
                    "time_slot": "07:30 AM - 10:00 AM",
                    "frequency": "Alternate Days"
                }
            ]

            for s_data in schedules_to_seed:
                # Check if schedule already exists
                stmt = select(PickupSchedule).where(PickupSchedule.area_name == s_data["area_name"])
                res = await session.execute(stmt)
                existing_sched = res.scalar_one_or_none()
                
                if not existing_sched:
                    sched = PickupSchedule(
                        area_name=s_data["area_name"],
                        city=s_data["city"],
                        collector_name=s_data["collector_name"],
                        time_slot=s_data["time_slot"],
                        frequency=s_data["frequency"],
                        is_active=True
                    )
                    session.add(sched)
                    await logger.ainfo("Seeded pickup schedule", area=s_data["area_name"])
                else:
                    await logger.adebug("Pickup schedule already exists, skipping", area=s_data["area_name"])

            # ==========================================
            # 3. Seed active Community Bin Reports (If citizen exists)
            # ==========================================
            if citizen_user:
                bin_reports_to_seed = [
                    {
                        "image_url": "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&q=80&w=600",
                        "latitude": 17.4326,
                        "longitude": 78.3844,
                        "address": "Near Hitec City Metro Station, Madhapur, Hyderabad",
                        "severity": "High (Overflowing Plastic Cups & Bottles)",
                        "status": ReportStatus.REPORTED,
                        "upvotes": 12
                    },
                    {
                        "image_url": "https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&q=80&w=600",
                        "latitude": 17.4156,
                        "longitude": 78.3415,
                        "address": "Jubilee Hills Road No. 10 opposite Park, Hyderabad",
                        "severity": "Medium (Damaged municipal dry bin lid)",
                        "status": ReportStatus.ASSIGNED,
                        "upvotes": 4
                    },
                    {
                        "image_url": "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&q=80&w=600",
                        "latitude": 17.4435,
                        "longitude": 78.3756,
                        "address": "Kondapur main road commercial complex, Hyderabad",
                        "severity": "High (Unsegregated piles blocking pathway)",
                        "status": ReportStatus.REPORTED,
                        "upvotes": 18
                    },
                    {
                        "image_url": "https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&q=80&w=600",
                        "latitude": 17.4023,
                        "longitude": 78.4124,
                        "address": "Banjara Hills Road No 2 corner, Hyderabad",
                        "severity": "Low (Minor spillover)",
                        "status": ReportStatus.COLLECTED,
                        "upvotes": 0
                    }
                ]

                for r_data in bin_reports_to_seed:
                    # Check duplicate based on exact address
                    stmt = select(BinReport).where(BinReport.address == r_data["address"])
                    res = await session.execute(stmt)
                    existing_report = res.scalar_one_or_none()
                    
                    if not existing_report:
                        report = BinReport(
                            user_id=citizen_user.id,
                            image_url=r_data["image_url"],
                            latitude=r_data["latitude"],
                            longitude=r_data["longitude"],
                            address=r_data["address"],
                            severity=r_data["severity"],
                            status=r_data["status"],
                            upvotes=r_data["upvotes"]
                        )
                        session.add(report)
                        await logger.ainfo("Seeded bin report", address=r_data["address"])

                # ==========================================
                # 4. Seed historical AI classification logs
                # ==========================================
                scans_to_seed = [
                    {
                        "image_url": "https://images.unsplash.com/photo-1618477388954-7852f32655ec?auto=format&fit=crop&q=80&w=600",
                        "category": "Plastic",
                        "bin_color": "Blue",
                        "confidence": 0.98,
                        "explanation": "Clear Polyethylene Terephthalate (PET) beverage bottle. Please empty any remaining content, rinse, compress, and place in the Blue bin."
                    },
                    {
                        "image_url": "https://images.unsplash.com/photo-1595079676339-1534801ad6cf?auto=format&fit=crop&q=80&w=600",
                        "category": "Metal",
                        "bin_color": "Blue",
                        "confidence": 0.94,
                        "explanation": "Aluminum soda beverage can. Recyclable infinitely. Rinse and compress to conserve space, then toss in the Blue bin."
                    },
                    {
                        "image_url": "https://images.unsplash.com/photo-1590005354167-6da97870c913?auto=format&fit=crop&q=80&w=600",
                        "category": "Organic",
                        "bin_color": "Green",
                        "confidence": 0.96,
                        "explanation": "Fresh fruit waste. Biodegradable wet waste. Suitable for composting. Place in the Green wet organic waste collection container."
                    },
                    {
                        "image_url": "https://images.unsplash.com/photo-1582139329536-e7284fece509?auto=format&fit=crop&q=80&w=600",
                        "category": "Paper",
                        "bin_color": "Blue",
                        "confidence": 0.91,
                        "explanation": "Dry packaging paper or shipping box. Empty of all packing tape and structural plastics, flatten to reduce footprint, and deposit into the Blue dry bin."
                    }
                ]

                for s_data in scans_to_seed:
                    # Check duplicates based on explanation
                    stmt = select(WasteReport).where(WasteReport.explanation == s_data["explanation"])
                    res = await session.execute(stmt)
                    existing_scan = res.scalar_one_or_none()
                    
                    if not existing_scan:
                        scan = WasteReport(
                            user_id=citizen_user.id,
                            image_url=s_data["image_url"],
                            category=s_data["category"],
                            bin_color=s_data["bin_color"],
                            confidence=s_data["confidence"],
                            explanation=s_data["explanation"]
                        )
                        session.add(scan)
                        await logger.ainfo("Seeded AI waste scan", category=s_data["category"])

            # Commit all operations
            await session.commit()
            await logger.ainfo("Database seeding completed successfully!")
            
        except Exception as e:
            await session.rollback()
            await logger.aerror("Database seeding failed due to an unexpected error", error=str(e))
            raise


async def init_and_seed_db() -> None:
    """
    Checks table presence, creates schemas if missing, and populates baseline seeds.
    """
    await logger.ainfo("Initializing database schemas...")
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        await logger.ainfo("Schema initialization check completed.")
        await seed_database()
    except Exception as e:
        await logger.aerror("Failed to auto-initialize and seed database", error=str(e))


if __name__ == "__main__":
    # Standard entry point to allow running `python -m app.database.seed`
    asyncio.run(init_and_seed_db())
