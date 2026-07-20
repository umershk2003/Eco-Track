import structlog
import asyncio

async def test():
    logger = structlog.get_logger()
    try:
        await logger.awarning('test')
        print("awarning worked")
    except Exception as e:
        print("awarning failed:", e)

    try:
        await logger.awarn('test2')
        print("awarn worked")
    except Exception as e:
        print("awarn failed:", e)

asyncio.run(test())
