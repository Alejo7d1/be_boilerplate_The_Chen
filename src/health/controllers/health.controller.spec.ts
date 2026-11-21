import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { HealthController } from '@Health/controllers';
import { HealthService } from '@Health/services';

describe('HealthController', () => {
  let healthController: HealthController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [HealthService, Reflector],
    }).compile();

    healthController = app.get<HealthController>(HealthController);
  });

  describe('root', () => {
    it('devuelve el estado del servicio', () => {
      expect(healthController.check()).toMatchObject({
        status: 'ok',
        service: 'si_be_boilerplate',
      });
    });
  });
});
