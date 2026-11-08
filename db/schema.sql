-- Fresco storefront — PostgreSQL schema (backup / restore reference)
--
-- Restore into an empty database:
--   createdb fresco && psql fresco < db/schema.sql
-- Then seed the catalogue by starting the app once (it seeds itself), or run:
--   node scripts/seed-account.mjs
--
-- The live app uses the same schema via Drizzle (src/db/schema.ts).
-- Keep both in sync when changing tables.

SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;

--
-- PostgreSQL database dump
--


-- Dumped from database version 15.19 (Debian 15.19-0+deb12u1)
-- Dumped by pg_dump version 15.19 (Debian 15.19-0+deb12u1)

SET idle_in_transaction_session_timeout = 0;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: addresses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.addresses (
    id integer NOT NULL,
    user_id integer NOT NULL,
    label text DEFAULT 'Home'::text NOT NULL,
    recipient text NOT NULL,
    line1 text NOT NULL,
    line2 text DEFAULT ''::text NOT NULL,
    city text NOT NULL,
    postcode text NOT NULL,
    phone text DEFAULT ''::text NOT NULL,
    instructions text DEFAULT ''::text NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: addresses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.addresses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: addresses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.addresses_id_seq OWNED BY public.addresses.id;


--
-- Name: bundles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bundles (
    id integer NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    subtitle text NOT NULL,
    item_slugs text[] DEFAULT '{}'::text[] NOT NULL,
    price_cents integer NOT NULL,
    compare_at_cents integer NOT NULL,
    badge text NOT NULL,
    theme text DEFAULT 'emerald'::text NOT NULL,
    emoji text NOT NULL,
    image_url text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL
);


--
-- Name: bundles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bundles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bundles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bundles_id_seq OWNED BY public.bundles.id;


--
-- Name: cart_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cart_items (
    id integer NOT NULL,
    cart_id integer NOT NULL,
    product_id integer NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cart_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cart_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cart_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cart_items_id_seq OWNED BY public.cart_items.id;


--
-- Name: carts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.carts (
    id integer NOT NULL,
    token text NOT NULL,
    coupon_code text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    user_id integer
);


--
-- Name: carts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.carts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: carts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.carts_id_seq OWNED BY public.carts.id;


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id integer NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    tagline text NOT NULL,
    emoji text NOT NULL,
    image_url text NOT NULL,
    accent text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL
);


--
-- Name: categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.categories_id_seq OWNED BY public.categories.id;


--
-- Name: coupons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.coupons (
    id integer NOT NULL,
    code text NOT NULL,
    description text NOT NULL,
    kind text DEFAULT 'percent'::text NOT NULL,
    percent_off integer,
    value_cents integer,
    min_subtotal_cents integer DEFAULT 0 NOT NULL,
    active boolean DEFAULT true NOT NULL
);


--
-- Name: coupons_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.coupons_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: coupons_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.coupons_id_seq OWNED BY public.coupons.id;


--
-- Name: offers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.offers (
    id integer NOT NULL,
    slug text NOT NULL,
    eyebrow text NOT NULL,
    title text NOT NULL,
    subtitle text NOT NULL,
    cta_label text NOT NULL,
    href text NOT NULL,
    theme text DEFAULT 'emerald'::text NOT NULL,
    badge text NOT NULL,
    emoji text NOT NULL,
    image_url text,
    sort_order integer DEFAULT 0 NOT NULL
);


--
-- Name: offers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.offers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: offers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.offers_id_seq OWNED BY public.offers.id;


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_items (
    id integer NOT NULL,
    order_id integer NOT NULL,
    product_slug text NOT NULL,
    name text NOT NULL,
    unit text NOT NULL,
    image_url text NOT NULL,
    price_cents integer NOT NULL,
    compare_at_cents integer,
    quantity integer NOT NULL
);


--
-- Name: order_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.order_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: order_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.order_items_id_seq OWNED BY public.order_items.id;


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id integer NOT NULL,
    order_number text NOT NULL,
    customer_name text NOT NULL,
    email text NOT NULL,
    phone text DEFAULT ''::text NOT NULL,
    address text NOT NULL,
    city text NOT NULL,
    postcode text NOT NULL,
    delivery_slot text NOT NULL,
    payment_method text NOT NULL,
    notes text DEFAULT ''::text NOT NULL,
    subtotal_cents integer NOT NULL,
    savings_cents integer NOT NULL,
    delivery_cents integer NOT NULL,
    discount_cents integer NOT NULL,
    total_cents integer NOT NULL,
    coupon_code text,
    item_count integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'confirmed'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_id integer,
    cancelled_at timestamp with time zone,
    checkout_id text
);


--
-- Name: orders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.orders_id_seq OWNED BY public.orders.id;


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id integer NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    brand text NOT NULL,
    category_slug text NOT NULL,
    unit text NOT NULL,
    price_cents integer NOT NULL,
    compare_at_cents integer,
    image_url text NOT NULL,
    description text NOT NULL,
    tags text[] DEFAULT '{}'::text[] NOT NULL,
    highlights text[] DEFAULT '{}'::text[] NOT NULL,
    rating_bp integer DEFAULT 480 NOT NULL,
    review_count integer DEFAULT 0 NOT NULL,
    stock integer DEFAULT 50 NOT NULL,
    badge text,
    is_organic boolean DEFAULT false NOT NULL,
    is_vegan boolean DEFAULT false NOT NULL,
    is_bestseller boolean DEFAULT false NOT NULL,
    is_new boolean DEFAULT false NOT NULL,
    popularity integer DEFAULT 50 NOT NULL,
    origin text DEFAULT 'Locally sourced'::text NOT NULL,
    storage text DEFAULT 'Keep in a cool, dry place.'::text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL
);


--
-- Name: products_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.products_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.products_id_seq OWNED BY public.products.id;


--
-- Name: saved_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.saved_items (
    id integer NOT NULL,
    user_id integer NOT NULL,
    product_slug text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: saved_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.saved_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: saved_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.saved_items_id_seq OWNED BY public.saved_items.id;


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessions (
    id integer NOT NULL,
    token text NOT NULL,
    user_id integer NOT NULL,
    user_agent text DEFAULT ''::text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sessions_id_seq OWNED BY public.sessions.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    email text NOT NULL,
    name text NOT NULL,
    phone text DEFAULT ''::text NOT NULL,
    password_hash text NOT NULL,
    marketing_opt_in boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: addresses id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.addresses ALTER COLUMN id SET DEFAULT nextval('public.addresses_id_seq'::regclass);


--
-- Name: bundles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bundles ALTER COLUMN id SET DEFAULT nextval('public.bundles_id_seq'::regclass);


--
-- Name: cart_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items ALTER COLUMN id SET DEFAULT nextval('public.cart_items_id_seq'::regclass);


--
-- Name: carts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.carts ALTER COLUMN id SET DEFAULT nextval('public.carts_id_seq'::regclass);


--
-- Name: categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories ALTER COLUMN id SET DEFAULT nextval('public.categories_id_seq'::regclass);


--
-- Name: coupons id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupons ALTER COLUMN id SET DEFAULT nextval('public.coupons_id_seq'::regclass);


--
-- Name: offers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.offers ALTER COLUMN id SET DEFAULT nextval('public.offers_id_seq'::regclass);


--
-- Name: order_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items ALTER COLUMN id SET DEFAULT nextval('public.order_items_id_seq'::regclass);


--
-- Name: orders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders ALTER COLUMN id SET DEFAULT nextval('public.orders_id_seq'::regclass);


--
-- Name: products id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products ALTER COLUMN id SET DEFAULT nextval('public.products_id_seq'::regclass);


--
-- Name: saved_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saved_items ALTER COLUMN id SET DEFAULT nextval('public.saved_items_id_seq'::regclass);


--
-- Name: sessions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions ALTER COLUMN id SET DEFAULT nextval('public.sessions_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: addresses addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.addresses
    ADD CONSTRAINT addresses_pkey PRIMARY KEY (id);


--
-- Name: bundles bundles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bundles
    ADD CONSTRAINT bundles_pkey PRIMARY KEY (id);


--
-- Name: bundles bundles_slug_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bundles
    ADD CONSTRAINT bundles_slug_unique UNIQUE (slug);


--
-- Name: cart_items cart_items_cart_product_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_cart_product_unique UNIQUE (cart_id, product_id);


--
-- Name: cart_items cart_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_pkey PRIMARY KEY (id);


--
-- Name: carts carts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.carts
    ADD CONSTRAINT carts_pkey PRIMARY KEY (id);


--
-- Name: carts carts_token_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.carts
    ADD CONSTRAINT carts_token_unique UNIQUE (token);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: categories categories_slug_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_slug_unique UNIQUE (slug);


--
-- Name: coupons coupons_code_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupons
    ADD CONSTRAINT coupons_code_unique UNIQUE (code);


--
-- Name: coupons coupons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupons
    ADD CONSTRAINT coupons_pkey PRIMARY KEY (id);


--
-- Name: offers offers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.offers
    ADD CONSTRAINT offers_pkey PRIMARY KEY (id);


--
-- Name: offers offers_slug_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.offers
    ADD CONSTRAINT offers_slug_unique UNIQUE (slug);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_order_number_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_order_number_unique UNIQUE (order_number);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: products products_slug_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_slug_unique UNIQUE (slug);


--
-- Name: saved_items saved_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saved_items
    ADD CONSTRAINT saved_items_pkey PRIMARY KEY (id);


--
-- Name: saved_items saved_items_user_product_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saved_items
    ADD CONSTRAINT saved_items_user_product_unique UNIQUE (user_id, product_slug);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_token_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_token_unique UNIQUE (token);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: addresses_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX addresses_user_idx ON public.addresses USING btree (user_id);


--
-- Name: order_items_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX order_items_order_idx ON public.order_items USING btree (order_id);


--
-- Name: orders_checkout_id_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX orders_checkout_id_unique ON public.orders USING btree (checkout_id);


--
-- Name: orders_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX orders_email_idx ON public.orders USING btree (email);


--
-- Name: orders_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX orders_user_idx ON public.orders USING btree (user_id);


--
-- Name: products_category_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX products_category_idx ON public.products USING btree (category_slug);


--
-- Name: sessions_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sessions_user_idx ON public.sessions USING btree (user_id);


--
-- PostgreSQL database dump complete
--


