import asyncio
import logging
from typing import Optional
from app.core.config import settings
from app.core.redis import redis_client
from app.services.whatsapp_service import WhatsAppService

logger = logging.getLogger("whatsapp_scheduler")

class WhatsAppScheduler:
    def __init__(self, service: Optional[WhatsAppService] = None, redis = None):
        self.service = service or WhatsAppService()
        self.redis = redis
        self.running_tasks = []

    async def _get_redis(self):
        if not self.redis:
            await redis_client.connect()
            self.redis = redis_client.redis
        return self.redis

    async def run_followup_24h_job(self):
        """
        Runs the 24h follow-up job. Uses Redis lock to prevent multiple workers
        from sending duplicate messages in a multi-process/production setup.
        """
        r = await self._get_redis()
        lock_key = "wa:lock:followup24h"
        # Try to acquire lock for 30 minutes (1800 seconds)
        acquired = await r.set(lock_key, "1", ex=1800, nx=True)
        
        if not acquired:
            logger.info("Follow-up job lock already acquired by another worker. Skipping.")
            return

        try:
            logger.info("Executing 24h WhatsApp follow-up check...")
            count = await self.service.process_followup_24h()
            logger.info(f"Finished 24h WhatsApp follow-up check. Sent: {count}")
        except Exception as e:
            logger.error(f"Error executing 24h follow-up job: {e}")

    async def run_reminder_6m_job(self):
        """
        Runs the 6-month checkup reminder job. Uses Redis lock.
        """
        r = await self._get_redis()
        lock_key = "wa:lock:reminder6m"
        # Try to acquire lock for 2 hours (7200 seconds)
        acquired = await r.set(lock_key, "1", ex=7200, nx=True)
        
        if not acquired:
            logger.info("6m reminder job lock already acquired by another worker. Skipping.")
            return

        try:
            logger.info("Executing 6m checkup WhatsApp reminder...")
            count = await self.service.process_reminder_6m()
            logger.info(f"Finished 6m checkup WhatsApp reminder. Sent: {count}")
        except Exception as e:
            logger.error(f"Error executing 6m reminder job: {e}")

    async def _followup_loop(self):
        """
        Loop that runs every hour.
        """
        interval = settings.WHATSAPP_SCHEDULER_INTERVAL_HOURS * 3600
        logger.info(f"Starting 24h follow-up scheduler loop (interval: {interval} seconds)...")
        # Small delay on startup so web server can finish booting
        await asyncio.sleep(10)
        while True:
            try:
                await self.run_followup_24h_job()
            except Exception as e:
                logger.error(f"Error in follow-up scheduler loop: {e}")
            await asyncio.sleep(interval)

    async def _reminder_loop(self):
        """
        Loop that runs every 24 hours.
        """
        interval = 86400  # 24 hours
        logger.info(f"Starting 6m reminder scheduler loop (interval: {interval} seconds)...")
        # Delay on startup
        await asyncio.sleep(20)
        while True:
            try:
                await self.run_reminder_6m_job()
            except Exception as e:
                logger.error(f"Error in 6m reminder scheduler loop: {e}")
            await asyncio.sleep(interval)

    def start(self):
        """
        Spawns background tasks. Should be called inside FastAPI startup/lifespan context.
        """
        loop = asyncio.get_event_loop()
        followup_task = loop.create_task(self._followup_loop())
        reminder_task = loop.create_task(self._reminder_loop())
        self.running_tasks.extend([followup_task, reminder_task])
        logger.info("WhatsApp background schedulers started.")

    def stop(self):
        """
        Cancels all running scheduler tasks on shutdown.
        """
        for task in self.running_tasks:
            if not task.done():
                task.cancel()
        logger.info("WhatsApp background schedulers stopped.")
