import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from './user';

@Entity()
export class LeaveRequest {
  @PrimaryGeneratedColumn()
  leaveRequestId!: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ default: 'Annual Leave' })
  leaveType!: string;

  @Column({ type: 'date' })
  startDate!: string;

  @Column({ type: 'date' })
  endDate!: string;

  @Column({ default: 'Pending' })
  status!: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';

  @Column({ nullable: true })
  reason!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
