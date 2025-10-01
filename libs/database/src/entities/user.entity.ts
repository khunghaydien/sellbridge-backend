import { BeforeInsert, BeforeUpdate, Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
@Entity('user')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({
        name: 'email',
        type: 'varchar',
        nullable: false,
        length: 60,
        unique: true,
    })
    email: string;

    @Column({
        name: 'password',
        type: 'text',
        nullable: false,
    })
    password: string;

    @Column({
        name: 'username',
        type: 'varchar',
        nullable: false,
        length: 255
    })
    username: string;

    @Column({
        name: 'phone',
        type: 'varchar',
        nullable: true,
        length: 255,
        unique: true,
    })
    phone: string;

    @Column({
        name: 'last_login_at',
        type: 'bigint',
        nullable: true,
    })
    lastLoginAt: number;

    @Column({
        name: 'status',
        comment: 'active, inactive',
        type: 'varchar',
        nullable: true,
        default: 'active',
    })
    status: string;

    @Column({
        name: 'role',
        comment: 'admin, page_admin, shop_owner',
        type: 'varchar',
        nullable: true,
        default: 'shop_owner'
    })
    role: string;

    @Column({
        name: 'created_at',
        type: 'bigint',
        nullable: false,
    })
    createdAt: number;

    @Column({
        name: 'updated_at',
        type: 'bigint',
        nullable: false,
    })
    updatedAt: number;

    @BeforeInsert()
    createDates() {
        this.createdAt = Date.now();
        this.updatedAt = this.createdAt;
    }

    @BeforeUpdate()
    updateDates() {
        this.updatedAt = Date.now();
    }
}
