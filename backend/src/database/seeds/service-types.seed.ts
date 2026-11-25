import 'dotenv/config';

import { NestFactory } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AppModule } from '../../app.module';
import { ServiceType } from '../../modules/service-types/entities/service-type.entity';

const SERVICE_TYPES = [
  {
    name: 'Plumbing',
    description: 'Plumbing installation, maintenance and repair services.',
  },
  {
    name: 'Electrical',
    description: 'Electrical installation, inspection and repair services.',
  },
  {
    name: 'Air Conditioning',
    description: 'Air conditioning installation, maintenance and repair.',
  },
  {
    name: 'Painting',
    description: 'Interior and exterior painting and finishing services.',
  },
  {
    name: 'Carpentry',
    description: 'Woodwork, furniture repair and carpentry services.',
  },
];

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const serviceTypeRepository = app.get<Repository<ServiceType>>(
      getRepositoryToken(ServiceType),
    );

    let createdCount = 0;
    let skippedCount = 0;

    for (const serviceTypeData of SERVICE_TYPES) {
      const existingServiceType = await serviceTypeRepository.findOne({
        where: { name: serviceTypeData.name },
      });

      if (existingServiceType) {
        skippedCount++;
        continue;
      }

      const serviceType = serviceTypeRepository.create({
        ...serviceTypeData,
        isActive: true,
      });

      await serviceTypeRepository.save(serviceType);
      createdCount++;
    }

    console.log('Service Types seed completed successfully.');
    console.log(`Created: ${createdCount}`);
    console.log(`Skipped: ${skippedCount}`);
  } finally {
    await app.close();
  }
}

bootstrap().catch((error: unknown) => {
  console.error('Service Types seed failed:', error);
  process.exitCode = 1;
});
