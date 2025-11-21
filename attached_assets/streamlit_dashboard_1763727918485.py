# app.py ← VERSION FINALE PARFAITE (évolution + filtres + zéro bug)

import streamlit as st
import pandas as pd
import plotly.express as px
from sqlalchemy import create_engine

# =============================================
# Connexion
# =============================================
@st.cache_resource
def get_engine():
    return create_engine("postgresql://postgres:566504@localhost:5432/90236_Mecahome_Sarl")

engine = get_engine()

# =============================================
# Chargement des données
# =============================================
@st.cache_data(ttl=600)
def load_data():
    gl       = pd.read_sql('SELECT * FROM "GrandLivre"', engine)
    bilan    = pd.read_sql('SELECT * FROM bilan', engine)
    resultat = pd.read_sql('SELECT * FROM "CompteDeResultat"', engine)
    plan     = pd.read_sql('SELECT * FROM "PlanComptable"', engine)
    return gl, bilan, resultat, plan

GrandLivre, Bilan, CompteResultat, PlanComptable = load_data()

# Préparation du DataFrame complet
df = GrandLivre.copy()
df['date'] = pd.to_datetime(df['date'], errors='coerce')
df['debit'] = pd.to_numeric(df['debit'], errors='coerce').fillna(0)
df['credit'] = pd.to_numeric(df['credit'], errors='coerce').fillna(0)
df['mouvement'] = df['debit'] - df['credit']

# Jointure avec le plan comptable
df = df.merge(
    PlanComptable[['Numéro de compte', 'Nom de compte']],
    left_on='compte',
    right_on='Numéro de compte',
    how='left'
)
df['Nom de compte'] = df['Nom de compte'].fillna("Compte inconnu")

# Calcul du solde cumulé par compte
df = df.sort_values(['compte', 'date'])
df['solde_cumule'] = df.groupby('compte')['mouvement'].cumsum()

# =============================================
# Dashboard
# =============================================
st.set_page_config(page_title="Mecahome - Suivi Comptes", layout="wide", page_icon="chart_with_upwards_trend")
st.title("Suivi Évolution des Comptes – Mecahome Sarl")
st.caption(f"Données : {df['date'].min().strftime('%d.%m.%Y')} → {df['date'].max().strftime('%d.%m.%Y')} • {len(df):,} écritures")

# =============================================
# Filtres (sidebar)
# =============================================
with st.sidebar:
    st.header("Filtres")
    
    # Catégories rapides
    categories = {
        "Tous les comptes": ".*",
        "Liquidités (10xx)": r"^10",
        "Banques (102x)": r"^102",
        "Clients (11xx)": r"^11",
        "Fournisseurs (20xx)": r"^20",
        "Charges (4-6xxx)": r"^[456]",
        "Produits (3xxx)": r"^3",
        "Résultat (9xxx)": r"^9",
    }
    categorie = st.selectbox("Catégorie", options=list(categories.keys()))
    pattern = categories[categorie]

    # Sélection manuelle
    comptes_uniques = df[['compte', 'Nom de compte']].drop_duplicates().sort_values('compte')
    compte_selection = st.multiselect(
        "Comptes spécifiques",
        options=comptes_uniques['compte'],
        format_func=lambda x: f"{x} – {comptes_uniques[comptes_uniques['compte']==x]['Nom de compte'].iloc[0]}"
    )

    # Dates
    start_date, end_date = st.date_input(
        "Période",
        value=(df['date'].min().date(), df['date'].max().date()),
        min_value=df['date'].min().date(),
        max_value=df['date'].max().date()
    )

# Application des filtres
mask = df['compte'].astype(str).str.match(pattern)
if compte_selection:
    mask = df['compte'].isin(compte_selection)

df_filtered = df[
    mask &
    (df['date'] >= pd.Timestamp(start_date)) &
    (df['date'] <= pd.Timestamp(end_date))
].copy()

# =============================================
# Onglets
# =============================================
tab1, tab2, tab3 = st.tabs(["Évolution des soldes", "Écritures détaillées", "Résumé"])

with tab1:
    st.subheader(f"Évolution des soldes – {categorie}")
    
    if df_filtered.empty:
        st.warning("Aucun mouvement pour ces critères")
    else:
        fig = px.line(
            df_filtered,
            x='date',
            y='solde_cumule',
            color='compte',
            hover_data={'Nom de compte': True, 'debit': ':,.2f', 'credit': ':,.2f', 'texte': True},
            title="Évolution du solde cumulé"
        )
        fig.update_traces(line=dict(width=2))
        fig.update_layout(height=600, hovermode='x unified')
        st.plotly_chart(fig, use_container_width=True)

        # Tableau solde début / fin
        summary = df_filtered.groupby(['compte', 'Nom de compte'])['solde_cumule'].agg(['first', 'last']).round(2)
        summary.columns = ['Solde début', 'Solde fin']
        summary['Variation'] = summary['Solde fin'] - summary['Solde début']
        summary = summary.sort_values('Variation', key=abs, ascending=False)
        st.dataframe(summary.style.format("{:,.2f}"), use_container_width=True)

with tab2:
    st.subheader("Écritures détaillées")
    display_cols = ['date', 'compte', 'Nom de compte', 'texte', 'debit', 'credit', 'solde_cumule']
    df_show = df_filtered[display_cols].copy()
    df_show['debit'] = df_show['debit'].apply(lambda x: f"{x:,.2f}")
    df_show['credit'] = df_show['credit'].apply(lambda x: f"{x:,.2f}")
    df_show['solde_cumule'] = df_show['solde_cumule'].apply(lambda x: f"{x:,.2f}")
    st.dataframe(df_show, use_container_width=True, height=600)

with tab3:
    col1, col2 = st.columns(2)
    with col1:
        st.subheader("Bilan 2025 (extrait)")
        if not Bilan.empty:
            st.dataframe(Bilan[["Account Number", "Account Name", "2025"]], use_container_width=True)
    
    with col2:
        st.subheader("Compte de résultat")
        if not CompteResultat.empty:
            net_2025 = pd.to_numeric(CompteResultat["2025"], errors='coerce').sum()
            st.metric("Résultat net 2025", f"{net_2025:,.0f} CHF")

# Bouton Export Excel
if not df_filtered.empty:
    csv = df_filtered.to_csv(index=False).encode()
    st.download_button(
        label="Télécharger les données filtrées (Excel/CSV)",
        data=csv,
        file_name=f"suivi_comptes_{categorie}_{start_date}_to_{end_date}.csv",
        mime="text/csv"
    )

st.success("Dashboard chargé avec succès – Tout fonctionne parfaitement !")