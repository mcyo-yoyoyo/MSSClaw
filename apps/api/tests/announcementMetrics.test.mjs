import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { createTestDatabase } from './helpers/pgTestDatabase.mjs';
import { AnnouncementMetricsController } from '../dist/persistence/announcement-metrics.controller.js';
test('publication gates detail/events; PV splits sources and UV deduplicates users', async () => {
 const database=await createTestDatabase('announcement_metrics');const db=new PrismaClient({datasourceUrl:database.url});
 let user={id:'reader-a',platformRole:'super_admin'};
 const controller=new AnnouncementMetricsController(db,{me:async()=>({ok:true,user})});
 try {
 await db.stationAnnouncement.create({data:{id:'test-ann',position:0,title:'test',body:'body',badge:'',publishedAt:new Date().toISOString(),listed:false}});
 const event={eventId:randomUUID(),kind:'view',source:'system'};
 await assert.rejects(controller.detail('test-ann'),/announcement_unavailable/);
 await assert.rejects(controller.event('test-ann',event),/announcement_unavailable/);
 await db.stationAnnouncement.update({where:{id:'test-ann'},data:{listed:true}});
 assert.equal((await controller.detail('test-ann')).body,'body');
 await controller.event('test-ann',event);await controller.event('test-ann',event);
 await controller.event('test-ann',{...event,eventId:randomUUID(),source:'share'});
 await controller.event('test-ann',{...event,eventId:randomUUID(),kind:'share'});
 user={...user,id:'reader-b'};
 await controller.event('test-ann',{...event,eventId:randomUUID(),source:'share'});
 assert.deepEqual((await controller.metrics())['test-ann'],{shares:1,pv:3,systemPv:1,sharePv:2,uv:2});
 await db.stationAnnouncement.update({where:{id:'test-ann'},data:{listed:false}});
 await assert.rejects(controller.detail('test-ann'),/announcement_unavailable/);
 await assert.rejects(controller.event('test-ann',{...event,eventId:randomUUID()}),/announcement_unavailable/);
 } finally {await db.$disconnect();await database.drop();}
});
