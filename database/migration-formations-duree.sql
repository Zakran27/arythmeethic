-- ============================================
-- Migration: ajoute la colonne `duree` à la table `formations`
-- À exécuter dans Supabase SQL Editor.
-- ============================================

ALTER TABLE public.formations
  ADD COLUMN IF NOT EXISTS duree text;
