"""
Main entry point for TestDriver Proxy
"""

import logging
import sys
from .config import Config
from .proxy import create_app


def setup_logging(log_level: str) -> None:
    """Configure logging"""
    logging.basicConfig(
        level=getattr(logging, log_level.upper()),
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        handlers=[logging.StreamHandler(sys.stdout)],
    )


def main() -> None:
    """Main entry point"""
    try:
        # Load configuration
        config = Config.from_env()
        config.validate()
        
        # Setup logging
        setup_logging(config.log_level)
        logger = logging.getLogger(__name__)
        
        logger.info("Starting TestDriver Proxy")
        logger.info(f"Listening on {config.host}:{config.port}")
        logger.info(f"Default model: {config.default_model}")
        logger.info(f"Vision model: {config.vision_model}")
        
        # Create and run app
        app = create_app(config)
        
        import uvicorn
        uvicorn.run(
            app,
            host=config.host,
            port=config.port,
            log_level=config.log_level.lower(),
        )
    
    except Exception as e:
        logging.error(f"Failed to start proxy: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()

